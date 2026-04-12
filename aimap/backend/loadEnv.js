/**
 * Load env từ aimap/.env (một file đồng bộ VPS / máy dev).
 * PHẢI import trước mọi route đọc process.env.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env') })
