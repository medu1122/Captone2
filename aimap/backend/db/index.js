/**
 * KẾT NỐI POSTGRES — POOL VÀ connectDB(), verifySchema().
 */
import pg from 'pg'
import { verifySchema } from './verifySchema.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
})

/** KẾT NỐI DB VÀ KIỂM TRA SCHEMA; THIẾU BẢNG THÌ CHỈ CẢNH BÁO. */
export async function connectDB() {
  try {
    const client = await pool.connect()
    client.release()
    console.log('Database connected successfully')
    const schema = await verifySchema(pool)
    if (!schema.ok) {
      console.warn(
        '[DB] Schema check: missing tables:',
        schema.missing.join(', '),
        '— Apply SQL from READ_CONTEXT/database_design.md (Section 8.0–8.5).'
      )
    }
  } catch (err) {
    console.error('Database connection failed:', err.message)
    process.exit(1)
  }
}

export { verifySchema }
export default pool
