/**
 * Kiểm tra database có đủ 15 bảng theo READ_CONTEXT/database_design.md hay không.
 * Gọi sau connectDB(); nếu thiếu bảng sẽ log warning (không exit).
 */

const REQUIRED_TABLES = [
  'logins',
  'user_profiles',
  'shops',
  'sites',
  'credit_transactions',
  'payments',
  'prompt_templates',
  'industry_tag_mappings',
  'assets',
  'facebook_page_tokens',
  'marketing_content',
  'pipeline_runs',
  'conversation_messages',
  'site_deployments',
  'activity_logs',
]

/**
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ ok: boolean, existing: string[], missing: string[] }>}
 */
export async function verifySchema(pool) {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    )
    const existing = new Set(result.rows.map((r) => r.table_name))
    const existingList = REQUIRED_TABLES.filter((t) => existing.has(t))
    const missing = REQUIRED_TABLES.filter((t) => !existing.has(t))
    return { ok: missing.length === 0, existing: existingList, missing }
  } finally {
    client.release()
  }
}

export default verifySchema
