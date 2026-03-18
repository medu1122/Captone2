import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function getUploadRoot() {
  const raw = process.env.ASSET_STORAGE_PATH || path.join(__dirname, '..', 'data', 'uploads')
  return path.resolve(raw)
}

export function publicBaseUrl() {
  return (process.env.API_PUBLIC_URL || 'http://localhost:4111').replace(/\/$/, '')
}

/**
 * @param {Buffer} buffer
 * @param {string} shopId
 * @param {string} ext e.g. png
 * @returns {{ filePath: string, publicUrl: string }}
 */
export async function saveShopAssetFile(buffer, shopId, ext = 'png') {
  const root = getUploadRoot()
  const dir = path.join(root, 'shops', shopId)
  await fs.mkdir(dir, { recursive: true })
  const name = `${randomUUID()}.${ext.replace(/^\./, '')}`
  const filePath = path.join(dir, name)
  await fs.writeFile(filePath, buffer)
  const rel = `/uploads/shops/${shopId}/${name}`
  return { filePath, publicUrl: `${publicBaseUrl()}${rel}` }
}

export async function fetchImageToBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type') || ''
  const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : ct.includes('webp') ? 'webp' : 'png'
  return { buffer: buf, mime: ct.split(';')[0] || 'image/png', ext }
}

export function parseDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return null
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64'), ext: m[1].includes('jpeg') ? 'jpg' : 'png' }
}
