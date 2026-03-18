/**
 * shopDeploy — per-shop Docker container management.
 * Mounted at /api/shops (after main shops router).
 *
 * POST   /:id/deploy           — create/start container, upsert site_deployments
 * GET    /:id/container        — get deployment status + live container stats
 * POST   /:id/container/stop   — stop container
 * DELETE /:id/container        — stop + remove container, clear deployment record
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createShopContainer,
  stopContainer,
  removeContainer,
  getContainerStats,
} from '../services/shopDockerService.js'

const router = Router()

async function ownerCheck(client, shopId, profileId) {
  const r = await client.query('SELECT id FROM shops WHERE id = $1 AND user_id = $2', [shopId, profileId])
  if (r.rows.length === 0) {
    const any = await client.query('SELECT id FROM shops WHERE id = $1', [shopId])
    if (any.rows.length === 0) return { err: 404, msg: 'Shop not found' }
    return { err: 403, msg: 'Access denied' }
  }
  return { ok: true }
}

async function ensureTable(client) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_deployments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        container_id     TEXT,
        container_name   TEXT,
        subdomain        TEXT UNIQUE,
        status           TEXT NOT NULL DEFAULT 'draft',
        port             INTEGER,
        deployed_at      TIMESTAMPTZ,
        last_build_at    TIMESTAMPTZ,
        error_message    TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  } catch (_) { /* already exists */ }
}

// — POST /api/shops/:id/deploy
router.post('/:id/deploy', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const check = await ownerCheck(client, id, profileId)
    if (check.err) return res.status(check.err).json({ error: check.msg })
    await ensureTable(client)

    const existing = await client.query(
      'SELECT * FROM site_deployments WHERE shop_id = $1',
      [id]
    )
    const prev = existing.rows[0]

    if (prev?.container_id && (prev.status === 'running' || prev.status === 'building')) {
      return res.status(409).json({ error: 'Container already running. Stop it first.' })
    }

    await client.query(
      `UPDATE site_deployments SET status = 'building', updated_at = NOW() WHERE shop_id = $1`,
      [id]
    )
    if (!prev) {
      await client.query(
        `INSERT INTO site_deployments (shop_id, status) VALUES ($1, 'building')`,
        [id]
      )
    }

    let containerId, containerName, port
    try {
      ;({ containerId, containerName, port } = await createShopContainer(id))
    } catch (dockerErr) {
      await client.query(
        `UPDATE site_deployments SET status = 'error', error_message = $1, updated_at = NOW() WHERE shop_id = $2`,
        [String(dockerErr.message).slice(0, 400), id]
      )
      return res.status(502).json({ error: 'Docker error: ' + dockerErr.message })
    }

    const result = await client.query(
      `INSERT INTO site_deployments
         (shop_id, container_id, container_name, status, port, deployed_at, last_build_at)
       VALUES ($1, $2, $3, 'running', $4, NOW(), NOW())
       ON CONFLICT (shop_id)
       DO UPDATE SET
         container_id = EXCLUDED.container_id,
         container_name = EXCLUDED.container_name,
         status = 'running',
         port = EXCLUDED.port,
         deployed_at = NOW(),
         last_build_at = NOW(),
         error_message = NULL,
         updated_at = NOW()
       RETURNING *`,
      [id, containerId, containerName, port]
    )

    res.status(201).json({ deployment: result.rows[0] })
  } catch (err) {
    console.error('deploy error:', err)
    res.status(500).json({ error: err.message || 'Deploy failed' })
  } finally {
    client.release()
  }
})

// — GET /api/shops/:id/container
router.get('/:id/container', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const check = await ownerCheck(client, id, profileId)
    if (check.err) return res.status(check.err).json({ error: check.msg })
    await ensureTable(client)

    const r = await client.query('SELECT * FROM site_deployments WHERE shop_id = $1', [id])
    if (!r.rows.length) return res.json({ deployment: null })

    const dep = r.rows[0]
    let liveStats = null
    if (dep.container_id) {
      liveStats = await getContainerStats(dep.container_id)
      if (liveStats) {
        const newStatus = liveStats.running ? 'running' : 'stopped'
        if (dep.status !== newStatus && dep.status !== 'error') {
          await client.query(
            'UPDATE site_deployments SET status = $1, updated_at = NOW() WHERE shop_id = $2',
            [newStatus, id]
          )
          dep.status = newStatus
        }
      }
    }

    res.json({ deployment: dep, liveStats })
  } catch (err) {
    console.error('container status error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// — POST /api/shops/:id/container/stop
router.post('/:id/container/stop', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const check = await ownerCheck(client, id, profileId)
    if (check.err) return res.status(check.err).json({ error: check.msg })
    await ensureTable(client)

    const r = await client.query('SELECT * FROM site_deployments WHERE shop_id = $1', [id])
    if (!r.rows.length || !r.rows[0].container_id) {
      return res.status(404).json({ error: 'No container found for this shop' })
    }
    await stopContainer(r.rows[0].container_id)
    await client.query(
      "UPDATE site_deployments SET status = 'stopped', updated_at = NOW() WHERE shop_id = $1",
      [id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('container stop error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// — DELETE /api/shops/:id/container
router.delete('/:id/container', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const check = await ownerCheck(client, id, profileId)
    if (check.err) return res.status(check.err).json({ error: check.msg })
    await ensureTable(client)

    const r = await client.query('SELECT * FROM site_deployments WHERE shop_id = $1', [id])
    if (!r.rows.length || !r.rows[0].container_id) {
      return res.status(404).json({ error: 'No container found for this shop' })
    }
    await removeContainer(r.rows[0].container_id, true)
    await client.query(
      `UPDATE site_deployments SET container_id = NULL, container_name = NULL,
       status = 'draft', port = NULL, updated_at = NOW() WHERE shop_id = $1`,
      [id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('container delete error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

export default router
