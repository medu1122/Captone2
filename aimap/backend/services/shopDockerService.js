/**
 * shopDockerService — manage per-shop Nginx containers via Dockerode.
 * Each shop gets one dedicated container: aimap-shop-<shopId>
 * The container mounts the shop's storage folder read-only so Nginx can serve assets.
 */
import Dockerode from 'dockerode'
import fs from 'fs/promises'
import { getUploadRoot } from './assetStorage.js'
import path from 'path'

const DOCKER_SOCKET = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
let docker = null

function getDocker() {
  if (!docker) {
    docker = new Dockerode({ socketPath: DOCKER_SOCKET })
  }
  return docker
}

const SHOP_CONTAINER_IMAGE = 'nginx:alpine'
const BASE_PORT = 32000
const MAX_PORT = 33000

/**
 * Find a free port in range [BASE_PORT, MAX_PORT] by listing running containers.
 */
async function findFreePort() {
  const d = getDocker()
  const running = await d.listContainers({ all: true })
  const usedPorts = new Set()
  for (const c of running) {
    for (const p of c.Ports || []) {
      if (p.PublicPort) usedPorts.add(p.PublicPort)
    }
  }
  for (let port = BASE_PORT; port <= MAX_PORT; port++) {
    if (!usedPorts.has(port)) return port
  }
  throw new Error('No free ports available in range 32000–33000')
}

/**
 * Build minimal nginx.conf string that serves /usr/share/nginx/html.
 */
function nginxConf(shopId) {
  return `
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  charset utf-8;
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /uploads/ {
    alias /usr/share/nginx/html/uploads/;
    add_header Cache-Control "public, max-age=86400";
  }
  # shop id header for debugging
  add_header X-Shop-Id "${shopId}";
}
`.trim()
}

/**
 * Create AND start a container for the given shop.
 * Returns { containerId, containerName, port }.
 */
export async function createShopContainer(shopId) {
  const d = getDocker()
  const containerName = `aimap-shop-${shopId}`
  const storageRoot = getUploadRoot()
  const shopDir = path.join(storageRoot, 'shops', shopId)
  await fs.mkdir(shopDir, { recursive: true })

  const existing = await d.listContainers({
    all: true,
    filters: JSON.stringify({ name: [containerName] }),
  })
  if (existing[0]?.Id) {
    const existingContainerId = existing[0].Id
    const existingPort = existing[0].Ports?.find((portMap) => portMap.PrivatePort === 80)?.PublicPort
    const runningState = String(existing[0].State || '').toLowerCase()
    if (!runningState.includes('running')) {
      await startContainer(existingContainerId)
    }
    return {
      containerId: existingContainerId,
      containerName,
      port: existingPort || null,
    }
  }

  const port = await findFreePort()
  try {
    await d.pull(SHOP_CONTAINER_IMAGE)
  } catch (_) {
    /* image may already be cached */
  }
  const container = await d.createContainer({
    Image: SHOP_CONTAINER_IMAGE,
    name: containerName,
    Labels: {
      'aimap.shop_id': shopId,
      'aimap.service': 'shop-site',
    },
    HostConfig: {
      PortBindings: {
        '80/tcp': [{ HostPort: String(port) }],
      },
      Binds: [
        `${shopDir}:/usr/share/nginx/html`,
      ],
      RestartPolicy: { Name: 'unless-stopped' },
    },
    ExposedPorts: { '80/tcp': {} },
  })

  await container.start()

  return { containerId: container.id, containerName, port }
}

/**
 * Start an existing (stopped) container.
 */
export async function startContainer(containerId) {
  const d = getDocker()
  const c = d.getContainer(containerId)
  await c.start()
}

/**
 * Stop a running container (graceful, 10s timeout).
 */
export async function stopContainer(containerId) {
  const d = getDocker()
  const c = d.getContainer(containerId)
  await c.stop({ t: 10 })
}

/**
 * Remove a container (must be stopped first, or force=true).
 */
export async function removeContainer(containerId, force = true) {
  const d = getDocker()
  const c = d.getContainer(containerId)
  await c.remove({ force })
}

/**
 * Get container inspect info + basic stats.
 * Returns { status, running, startedAt, cpuPercent, memUsageMb } or null if not found.
 */
export async function getContainerStats(containerId) {
  const d = getDocker()
  try {
    const c = d.getContainer(containerId)
    const info = await c.inspect()
    const state = info.State || {}

    let cpuPercent = 0
    let memUsageMb = 0
    if (state.Running) {
      try {
        const statsStream = await c.stats({ stream: false })
        const cpu = statsStream.cpu_stats
        const preCpu = statsStream.precpu_stats
        const cpuDelta = (cpu.cpu_usage?.total_usage ?? 0) - (preCpu.cpu_usage?.total_usage ?? 0)
        const systemDelta = (cpu.system_cpu_usage ?? 0) - (preCpu.system_cpu_usage ?? 0)
        const numCpus = cpu.cpu_usage?.percpu_usage?.length || 1
        if (systemDelta > 0) cpuPercent = Math.round((cpuDelta / systemDelta) * numCpus * 100 * 10) / 10
        const mem = statsStream.memory_stats
        memUsageMb = Math.round(((mem.usage ?? 0) / 1024 / 1024) * 10) / 10
      } catch (_) { /* stats unavailable in some Docker versions */ }
    }

    return {
      status: state.Status,
      running: state.Running,
      startedAt: state.StartedAt,
      finishedAt: state.FinishedAt,
      cpuPercent,
      memUsageMb,
    }
  } catch (err) {
    if (err.statusCode === 404) return null
    throw err
  }
}

/**
 * List all aimap-shop-* containers with their labels.
 */
export async function listShopContainers() {
  const d = getDocker()
  const all = await d.listContainers({ all: true, filters: JSON.stringify({ label: ['aimap.service=shop-site'] }) })
  return all.map((c) => ({
    containerId: c.Id,
    containerName: (c.Names?.[0] || '').replace(/^\//, ''),
    shopId: c.Labels?.['aimap.shop_id'] || null,
    status: c.State,
    ports: c.Ports,
  }))
}
