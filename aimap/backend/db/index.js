import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

export async function connectDB() {
  try {
    const client = await pool.connect()
    client.release()
    console.log('Database connected successfully')
  } catch (err) {
    console.error('Database connection failed:', err.message)
    process.exit(1)
  }
}

export default pool
