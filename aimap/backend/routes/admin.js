/**
 * ROUTES ADMIN — Quản lý user cho Admin
 * Chỉ user có role = 'admin' mới được truy cập
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/** MIDDLEWARE: Kiểm tra là Admin (phải gọi sau requireAuth) */
async function requireAdmin(req, res, next) {
  const { loginId } = req.auth
  const client = await pool.connect()
  try {
    const row = await client.query('SELECT role FROM logins WHERE id = $1', [loginId])
    if (row.rows.length === 0 || row.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  } catch (err) {
    console.error('Check admin error:', err)
    res.status(500).json({ error: 'Failed to verify admin' })
  } finally {
    client.release()
  }
}

// ============================================================
// ADMIN ROUTES - Quản lý Users
// ============================================================

// — DANH SÁCH USERS (có pagination và search)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const search = req.query.search || ''
  const offset = (page - 1) * limit

  const client = await pool.connect()
  try {
    // Query với search theo email hoặc name
    let whereClause = ''
    let params = []
    
    if (search) {
      whereClause = 'WHERE l.email ILIKE $1 OR up.name ILIKE $1'
      params = [`%${search}%`]
    }

    // Đếm tổng số users
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_profiles up
      JOIN logins l ON l.id = up.login_id
      ${whereClause}
    `
    const countResult = await client.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Lấy danh sách users
    const dataQuery = `
      SELECT 
        up.id,
        up.name,
        l.email,
        l.role,
        l.status,
        l.last_login_at,
        up.created_at
      FROM user_profiles up
      JOIN logins l ON l.id = up.login_id
      ${whereClause}
      ORDER BY up.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    const dataResult = await client.query(dataQuery, [...params, limit, offset])

    res.json({
      success: true,
      users: dataResult.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Failed to list users' })
  } finally {
    client.release()
  }
})

// — CHI TIẾT 1 USER
router.get('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    const row = await client.query(
      `SELECT 
         up.id,
         up.name,
         up.phone,
         up.avatar_url,
         up.address,
         up.city,
         up.district,
         up.country,
         up.postal_code,
         up.date_of_birth,
         up.gender,
         up.company_name,
         up.bio,
         up.timezone,
         up.locale,
         up.email_contact,
         up.created_at,
         up.updated_at,
         l.email,
         l.role,
         l.status,
         l.last_login_at
       FROM user_profiles up
       JOIN logins l ON l.id = up.login_id
       WHERE up.id = $1`,
      [id]
    )
    if (row.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const u = row.rows[0]
    res.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        phone: u.phone || '',
        avatarUrl: u.avatar_url,
        address: u.address || '',
        city: u.city || '',
        district: u.district || '',
        country: u.country || '',
        postalCode: u.postal_code || '',
        dateOfBirth: u.date_of_birth,
        gender: u.gender || '',
        companyName: u.company_name || '',
        bio: u.bio || '',
        timezone: u.timezone || '',
        locale: u.locale || 'vi',
        emailContact: u.email_contact || '',
        email: u.email,
        role: u.role,
        status: u.status,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      },
    })
  } catch (err) {
    console.error('Get user detail error:', err)
    res.status(500).json({ error: 'Failed to get user' })
  } finally {
    client.release()
  }
})

// — CẬP NHẬT THÔNG TIN USER (không cho update email, password, role)
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const {
    name,
    phone,
    avatarUrl,
    address,
    city,
    district,
    country,
    postalCode,
    dateOfBirth,
    gender,
    companyName,
    bio,
    timezone,
    locale,
    emailContact,
  } = req.body || {}

  // Validate name
  if (name !== undefined && name.trim() === '') {
    return res.status(400).json({ error: 'Name cannot be empty' })
  }

  const client = await pool.connect()
  try {
    // Kiểm tra user tồn tại
    const check = await client.query('SELECT id FROM user_profiles WHERE id = $1', [id])
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Cập nhật các fields được gửi
    await client.query(
      `UPDATE user_profiles SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         avatar_url = COALESCE($3, avatar_url),
         address = COALESCE($4, address),
         city = COALESCE($5, city),
         district = COALESCE($6, district),
         country = COALESCE($7, country),
         postal_code = COALESCE($8, postal_code),
         date_of_birth = COALESCE($9, date_of_birth),
         gender = COALESCE($10, gender),
         company_name = COALESCE($11, company_name),
         bio = COALESCE($12, bio),
         timezone = COALESCE($13, timezone),
         locale = COALESCE($14, locale),
         email_contact = COALESCE($15, email_contact),
         updated_at = NOW()
       WHERE id = $16`,
      [
        name || null,
        phone || null,
        avatarUrl || null,
        address || null,
        city || null,
        district || null,
        country || null,
        postalCode || null,
        dateOfBirth || null,
        gender || null,
        companyName || null,
        bio || null,
        timezone || null,
        locale || null,
        emailContact || null,
        id,
      ]
    )

    res.json({ success: true, message: 'User updated' })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  } finally {
    client.release()
  }
})

// — BLOCK/UNBLOCK USER (thay đổi status)
router.put('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  // Validate status
  if (!status || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "suspended"' })
  }

  const client = await pool.connect()
  try {
    // Lấy login_id từ profile
    const profile = await client.query(
      'SELECT login_id FROM user_profiles WHERE id = $1',
      [id]
    )
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const loginId = profile.rows[0].login_id

    // Không cho block chính mình
    if (loginId === req.auth.loginId) {
      return res.status(400).json({ error: 'Cannot change your own status' })
    }

    // Cập nhật status trong logins
    await client.query(
      'UPDATE logins SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, loginId]
    )

    res.json({ success: true, message: `User ${status === 'active' ? 'unblocked' : 'blocked'}` })
  } catch (err) {
    console.error('Change status error:', err)
    res.status(500).json({ error: 'Failed to change user status' })
  } finally {
    client.release()
  }
})

// — CẤP CREDIT CHO USER (admin)
router.post('/users/:id/credits', requireAuth, requireAdmin, async (req, res) => {
  const { id: targetProfileId } = req.params
  const { amount, description } = req.body || {}
  const n = parseInt(amount, 10)
  if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
    return res.status(400).json({ error: 'amount must be a positive integer (1–1000000)' })
  }
  const { profileId: adminProfileId } = req.auth
  const desc =
    typeof description === 'string' && description.trim()
      ? description.trim().slice(0, 500)
      : 'Admin credit grant'

  const client = await pool.connect()
  try {
    const check = await client.query('SELECT id FROM user_profiles WHERE id = $1', [targetProfileId])
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, type, reference_type, reference_id, description)
       VALUES ($1, $2, 'bonus', 'admin_grant', $3, $4)`,
      [targetProfileId, n, String(adminProfileId), desc]
    )
    const bal = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM credit_transactions WHERE user_id = $1`,
      [targetProfileId]
    )
    res.json({ success: true, creditBalance: bal.rows[0].balance })
  } catch (err) {
    console.error('Admin grant credit error:', err)
    res.status(500).json({ error: 'Failed to grant credits' })
  } finally {
    client.release()
  }
})

// — XÓA USER
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    // Lấy login_id từ profile
    const profile = await client.query(
      'SELECT login_id FROM user_profiles WHERE id = $1',
      [id]
    )
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const loginId = profile.rows[0].login_id

    // Không cho xóa chính mình
    if (loginId === req.auth.loginId) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }

    // Xóa login (cascade sẽ xóa profile)
    await client.query('DELETE FROM logins WHERE id = $1', [loginId])

    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  } finally {
    client.release()
  }
})

export default router
