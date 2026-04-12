/**
 * SCRIPT MỘT LẦN: +1000 CREDIT CHO USER CHƯA CÓ BẢN GHI demo_seed_v1.
 * CHẠY TỪ aimap/backend: NODE SCRIPTS/SEEDDEMOCREDITS1000.JS (CẦN DATABASE_URL).
 */
import '../loadEnv.js'
import pool from '../db/index.js'

const REF_TYPE = 'demo_seed_v1'
const AMOUNT = 1000

async function main() {
  const client = await pool.connect()
  try {
    const users = await client.query('SELECT id FROM user_profiles')
    let n = 0
    for (const row of users.rows) {
      const uid = row.id
      const ex = await client.query(
        `SELECT 1 FROM credit_transactions WHERE user_id = $1 AND reference_type = $2 LIMIT 1`,
        [uid, REF_TYPE]
      )
      if (ex.rows.length > 0) continue
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, type, reference_type, reference_id, description)
         VALUES ($1, $2, 'bonus', $3, $4, $5)`,
        [uid, AMOUNT, REF_TYPE, 'seed', 'Demo seed 1000 credit (one-time)']
      )
      n += 1
    }
    console.log(`seedDemoCredits1000: inserted for ${n} users (skipped if already had ${REF_TYPE})`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
