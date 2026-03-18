/**
 * Seed prompt_templates from Promp_AI/Prompt_image/*.md
 * Run: node scripts/seedPromptImages.js (from aimap/backend)
 * Env: DATABASE_URL
 */
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROMPT_DIR = path.resolve(__dirname, '../../../Promp_AI/Prompt_image')

function tagFromFilename(base) {
  const m = base.match(/^([A-Za-z]+)/)
  return (m ? m[1] : base).toUpperCase()
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM prompt_templates WHERE name LIKE 'seed_image_%'`)
    const files = (await fs.readdir(PROMPT_DIR)).filter((f) => f.endsWith('.md'))
    let n = 0
    for (const file of files) {
      const full = path.join(PROMPT_DIR, file)
      const content = (await fs.readFile(full, 'utf8')).trim()
      if (!content) continue
      const base = path.basename(file, '.md')
      const tag = tagFromFilename(base)
      const name = `seed_image_${base}`
      const tagsJson = JSON.stringify([tag])
      await client.query(
        `INSERT INTO prompt_templates (type, category, name, content, tags, is_system, is_active, sort_order)
         VALUES ('post', 'image', $1, $2, $3::jsonb, true, true, $4)`,
        [name, content, tagsJson, n++]
      )
    }
    console.log(`Seeded ${n} image prompt_templates from ${PROMPT_DIR}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
