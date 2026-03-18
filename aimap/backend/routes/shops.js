/**
 * ROUTES SHOPS — CRUD + slugs; ghi activity_log khi tạo/cập nhật shop.
 * GET /, GET /slugs, POST /, GET /:id, PATCH /:id
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { logActivity } from '../services/activityLog.js'
import { deleteLocalShopAssetFile } from '../services/assetStorage.js'

const router = Router()

/** Slug pattern: only a-z, 0-9, hyphen */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeSlug(s) {
  if (typeof s !== 'string') return ''
  return s.trim().toLowerCase().replace(/\s+/g, '-')
}

function validateCreateBody(body) {
  const errors = []
  const {
    name,
    slug,
    industry,
    description,
    address,
    city,
    district,
    country,
    postal_code,
    contact_info,
  } = body || {}

  if (!name || String(name).trim().length === 0) errors.push('name is required')
  if (String(name).trim().length > 255) errors.push('name max 255 characters')

  const rawSlug = slug ?? ''
  const normalized = normalizeSlug(rawSlug)
  if (!normalized) errors.push('slug is required')
  else if (!SLUG_REGEX.test(normalized)) errors.push('slug must be a-z, 0-9 and hyphens only')
  else if (normalized.length > 255) errors.push('slug max 255 characters')

  const ci = contact_info && typeof contact_info === 'object' ? contact_info : {}
  if (!String(ci.phone || '').trim()) errors.push('contact_info.phone is required')
  if (!String(ci.email || '').trim()) errors.push('contact_info.email is required')
  if (!String(ci.owner_name || '').trim()) errors.push('contact_info.owner_name is required')

  return {
    errors,
    data: {
      name: String(name || '').trim(),
      slug: normalized,
      industry: industry != null ? String(industry).trim() : '',
      description: description != null ? String(description).trim() : '',
      address: address != null ? String(address).trim() : '',
      city: city != null ? String(city).trim() : '',
      district: district != null ? String(district).trim() : '',
      country: country != null ? String(country).trim() : '',
      postal_code: postal_code != null ? String(postal_code).trim() : '',
      contact_info: {
        phone: String(ci.phone || '').trim(),
        email: String(ci.email || '').trim(),
        owner_name: String(ci.owner_name || '').trim(),
      },
    },
  }
}

// — GET /api/shops — danh sách shop của user
router.get('/', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT id, name, slug, industry, description, logo_url, cover_url, status, created_at
       FROM shops
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [profileId]
    )
    res.json({ shops: result.rows })
  } catch (err) {
    console.error('List shops error:', err)
    res.status(500).json({ error: 'Failed to list shops' })
  } finally {
    client.release()
  }
})

// — GET /api/shops/slugs — tất cả slug (đặt trước GET /:id)
router.get('/slugs', async (req, res) => {
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT slug FROM shops')
    res.json(result.rows.map((r) => r.slug))
  } catch (err) {
    console.error('Slugs error:', err)
    res.status(500).json({ error: 'Failed to get slugs' })
  } finally {
    client.release()
  }
})

// — GET /api/shops/:id/assets — ảnh trong shop (Image bot gallery / Storage)
router.get('/:id/assets', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const shop = await client.query('SELECT id FROM shops WHERE id = $1 AND user_id = $2', [id, profileId])
    if (shop.rows.length === 0) {
      const any = await client.query('SELECT id FROM shops WHERE id = $1', [id])
      if (any.rows.length === 0) return res.status(404).json({ error: 'Shop not found' })
      return res.status(403).json({ error: 'Access denied' })
    }
    const r = await client.query(
      `SELECT id, type, name, storage_path_or_url, mime_type, model_source, created_at
       FROM assets WHERE shop_id = $1 ORDER BY created_at DESC`,
      [id]
    )
    res.json({ assets: r.rows })
  } catch (err) {
    if (err.code === '42P01') {
      res.json({ assets: [] })
    } else {
      console.error('List assets error:', err)
      res.status(500).json({ error: 'Failed to list assets' })
    }
  } finally {
    client.release()
  }
})

// — DELETE /api/shops/:id/assets/:assetId — xóa asset (chủ shop); xóa file local nếu có
router.delete('/:id/assets/:assetId', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id, assetId } = req.params
  const client = await pool.connect()
  try {
    const shop = await client.query('SELECT id FROM shops WHERE id = $1 AND user_id = $2', [id, profileId])
    if (shop.rows.length === 0) {
      const any = await client.query('SELECT id FROM shops WHERE id = $1', [id])
      if (any.rows.length === 0) return res.status(404).json({ error: 'Shop not found' })
      return res.status(403).json({ error: 'Access denied' })
    }
    const row = await client.query(
      'SELECT id, storage_path_or_url FROM assets WHERE id = $1 AND shop_id = $2',
      [assetId, id]
    )
    if (!row.rows.length) return res.status(404).json({ error: 'Asset not found' })
    const storagePathOrUrl = row.rows[0].storage_path_or_url
    await deleteLocalShopAssetFile(storagePathOrUrl, id)
    await client.query('DELETE FROM assets WHERE id = $1 AND shop_id = $2', [assetId, id])
    try {
      await logActivity(pool, {
        userId: profileId,
        action: 'delete_shop_asset',
        entityType: 'asset',
        entityId: assetId,
        details: { shop_id: id },
        severity: 'info',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (e) {
      console.warn('activity log delete_shop_asset:', e.message)
    }
    res.json({ ok: true })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'assets table not available' })
    }
    console.error('Delete asset error:', err)
    res.status(500).json({ error: 'Failed to delete asset' })
  } finally {
    client.release()
  }
})

// — GET /api/shops/:id/industry-tags — tags ngành hàng theo shop (để gắn tag cho sản phẩm)
router.get('/:id/industry-tags', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const shopRow = await client.query('SELECT id, industry FROM shops WHERE id = $1 AND user_id = $2', [id, profileId])
    if (shopRow.rows.length === 0) {
      const any = await client.query('SELECT id FROM shops WHERE id = $1', [id])
      if (any.rows.length === 0) return res.status(404).json({ error: 'Shop not found' })
      return res.status(403).json({ error: 'Access denied' })
    }
    const industry = shopRow.rows[0].industry || ''
    let industryTags = []
    if (industry) {
      try {
        const tagRow = await client.query(
          'SELECT tags FROM industry_tag_mappings WHERE TRIM(industry) = TRIM($1) LIMIT 1',
          [industry]
        )
        if (tagRow.rows[0]?.tags) {
          industryTags = Array.isArray(tagRow.rows[0].tags)
            ? tagRow.rows[0].tags.map(String)
            : []
        }
      } catch (_) {}
    }
    if (!industryTags.includes('GENERAL')) industryTags = [...industryTags, 'GENERAL']
    const ALL_TAGS = [
      { tag: 'DOUONG', label: 'Đồ uống' }, { tag: 'DOAN', label: 'Đồ ăn' },
      { tag: 'AOQUAN', label: 'Quần áo' }, { tag: 'GIAYDEP', label: 'Giày dép' },
      { tag: 'PHUKIEN', label: 'Phụ kiện' }, { tag: 'DULICH', label: 'Du lịch' },
      { tag: 'BOOKING', label: 'Booking/Khách sạn' }, { tag: 'GIAODUC', label: 'Giáo dục' },
      { tag: 'SUCKHOE', label: 'Sức khỏe' }, { tag: 'SPA', label: 'Spa' },
      { tag: 'GYM', label: 'Gym/Yoga' }, { tag: 'MYPHAM', label: 'Mỹ phẩm' },
      { tag: 'TOCHUC', label: 'Salon tóc' }, { tag: 'CONGNGHE', label: 'Công nghệ' },
      { tag: 'NOITHAT', label: 'Nội thất' }, { tag: 'XAYDUNG', label: 'Xây dựng' },
      { tag: 'BATDONGSAN', label: 'Bất động sản' }, { tag: 'OTO', label: 'Ô tô' },
      { tag: 'XEMAY', label: 'Xe máy' }, { tag: 'THUYCUNG', label: 'Thú cưng' },
      { tag: 'HOAQUA', label: 'Hoa quả' }, { tag: 'HOA', label: 'Hoa tươi' },
      { tag: 'SUKIEN', label: 'Sự kiện' }, { tag: 'NHIEPAN', label: 'Nhiếp ảnh' },
      { tag: 'INANUONG', label: 'In ấn' }, { tag: 'VANTAI', label: 'Vận tải' },
      { tag: 'TAICHINH', label: 'Tài chính' }, { tag: 'LUATPHAP', label: 'Luật' },
      { tag: 'NONGSAN', label: 'Nông sản' }, { tag: 'THUISAN', label: 'Thủy hải sản' },
      { tag: 'TREEM', label: 'Trẻ em' }, { tag: 'THETHAO', label: 'Thể thao' },
      { tag: 'GAME', label: 'Game' }, { tag: 'SACH', label: 'Sách' },
      { tag: 'DIENGIA', label: 'Điện gia dụng' }, { tag: 'NHACCU', label: 'Nhạc cụ' },
      { tag: 'HANDMADE', label: 'Handmade' }, { tag: 'NGOAINGU', label: 'Ngoại ngữ' },
      { tag: 'GENERAL', label: 'Chung (tất cả ngành)' },
    ]
    res.json({ industry, tags: industryTags, allTags: ALL_TAGS })
  } catch (err) {
    console.error('industry-tags error:', err)
    res.status(500).json({ error: 'Failed to get industry tags' })
  } finally {
    client.release()
  }
})

// — POST /api/shops — tạo shop mới
router.post('/', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { errors, data } = validateCreateBody(req.body)
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors })
  }

  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT id FROM shops WHERE slug = $1', [data.slug])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Slug already in use' })
    }

    const insert = await client.query(
      `INSERT INTO shops (
         user_id, name, slug, industry, description,
         address, city, district, country, postal_code, contact_info, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'active')
       RETURNING *`,
      [
        profileId,
        data.name,
        data.slug,
        data.industry,
        data.description,
        data.address,
        data.city,
        data.district,
        data.country,
        data.postal_code,
        JSON.stringify(data.contact_info),
      ]
    )
    const shop = insert.rows[0]

    await logActivity(pool, {
      userId: profileId,
      action: 'create_shop',
      entityType: 'shop',
      entityId: shop.id,
      details: { shop_name: shop.name, slug: shop.slug },
      severity: 'info',
      ipAddress: req.ip || req.headers['x-forwarded-for'],
    })

    res.status(201).json(shop)
  } catch (err) {
    console.error('Create shop error:', err)
    res.status(500).json({ error: 'Failed to create shop' })
  } finally {
    client.release()
  }
})

// — GET /api/shops/:id — chi tiết một shop (chỉ chủ sở hữu)
router.get('/:id', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT * FROM shops WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' })
    }
    const shop = result.rows[0]
    if (shop.user_id !== profileId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    res.json(shop)
  } catch (err) {
    console.error('Get shop error:', err)
    res.status(500).json({ error: 'Failed to get shop' })
  } finally {
    client.release()
  }
})

// — PATCH /api/shops/:id — cập nhật shop (chỉ chủ sở hữu)
router.patch('/:id', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const body = req.body || {}

  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT * FROM shops WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' })
    }
    const shop = existing.rows[0]
    if (shop.user_id !== profileId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const allowed = [
      'name', 'industry', 'description', 'address', 'city', 'district',
      'country', 'postal_code', 'contact_info', 'products', 'website_url',
      'logo_url', 'cover_url', 'social_links', 'opening_hours', 'status',
    ]
    const updates = []
    const values = []
    let idx = 1

    for (const key of allowed) {
      if (!(key in body)) continue
      if (key === 'contact_info' || key === 'products' || key === 'social_links' || key === 'opening_hours') {
        updates.push(`${key} = $${idx}::jsonb`)
        values.push(JSON.stringify(body[key]))
      } else {
        updates.push(`${key} = $${idx}`)
        values.push(body[key])
      }
      idx += 1
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    values.push(id)
    const result = await client.query(
      `UPDATE shops SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    )
    const updated = result.rows[0]

    await logActivity(pool, {
      userId: profileId,
      action: 'update_shop',
      entityType: 'shop',
      entityId: updated.id,
      details: { shop_name: updated.name, slug: updated.slug },
      severity: 'info',
      ipAddress: req.ip || req.headers['x-forwarded-for'],
    })

    res.json(updated)
  } catch (err) {
    console.error('Update shop error:', err)
    res.status(500).json({ error: 'Failed to update shop' })
  } finally {
    client.release()
  }
})

export default router
