/**
 * Activity log service — ghi nhật ký hoạt động vào bảng activity_logs.
 * Backend gọi khi user tạo/sửa shop hoặc thao tác khác; không để frontend gửi log (tránh giả mạo).
 */

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   userId: string | null;
 *   action: string;
 *   entityType: string;
 *   entityId?: string | null;
 *   details?: Record<string, unknown>;
 *   severity?: 'info' | 'warning' | 'error';
 *   ipAddress?: string | null;
 * }} opts
 * @returns {Promise<void>}
 */
export async function logActivity(pool, {
  userId,
  action,
  entityType,
  entityId = null,
  details = {},
  severity = 'info',
  ipAddress = null,
}) {
  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, severity, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        userId ?? null,
        action,
        entityType,
        entityId ?? null,
        JSON.stringify(details),
        severity,
        ipAddress ?? null,
      ]
    )
  } finally {
    client.release()
  }
}
