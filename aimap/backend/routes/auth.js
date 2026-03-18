/**
 * ROUTES AUTH — KHỚP READ_CONTEXT/DATABASE_DESIGN.MD (LOGINS + USER_PROFILES).
 * POST /api/auth/register, login, verify, resend-verify-code, forgot-password, reset-password
 */
import { Router } from 'express'
import bcrypt from 'bcrypt'
import pool from '../db/index.js'
import { signToken, verifyToken, requireAuth } from '../middleware/auth.js'
import {
  sendVerificationCodeEmail,
  sendResetPasswordEmail,
  isEmailConfigured,
  FRONTEND_URL,
} from '../services/email.js'
import { logActivity } from '../services/activityLog.js'

const router = Router()
const RESET_TOKEN_EXPIRES = '1h'
const BCRYPT_ROUNDS = 10
const VERIFY_CODE_EXPIRES_MINUTES = 15
const SIGNUP_CREDIT_BONUS = 100

/** SINH MÃ 6 SỐ NGẪU NHIÊN CHO XÁC THỰC EMAIL */
function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Normalize IP for storage/display: drop zone id, IPv4-mapped → IPv4. */
function normalizeClientIp(raw) {
  if (!raw || typeof raw !== 'string') return null
  let s = raw.trim().slice(0, 80)
  const zi = s.indexOf('%')
  if (zi > 0) s = s.slice(0, zi)
  if (s.startsWith('[') && s.includes(']')) s = s.slice(1, s.indexOf(']'))
  const low = s.toLowerCase()
  const v4map = low.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (v4map) return v4map[1]
  return s || null
}

/** Client IP for access log (trust proxy when TRUST_PROXY is set on app). */
function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  let candidate = null
  if (typeof xff === 'string' && xff.trim()) {
    candidate = xff.split(',')[0].trim()
  } else if (Array.isArray(xff) && xff[0]) {
    candidate = String(xff[0]).trim()
  }
  if (!candidate) {
    candidate = req.ip || req.socket?.remoteAddress
    candidate = candidate ? String(candidate) : null
  }
  return normalizeClientIp(candidate || '')
}

// — ĐĂNG KÝ (CHỈ LƯU PENDING + MÃ 6 SỐ; TÀI KHOẢN CHỈ TẠO SAU KHI VERIFY)
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing email, password, or name' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const client = await pool.connect()
  try {
    const existingLogin = await client.query('SELECT id FROM logins WHERE email = $1', [normalizedEmail])
    if (existingLogin.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await client.query(
      `INSERT INTO pending_registrations (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, created_at = NOW()`,
      [normalizedEmail, passwordHash, (name || '').trim()]
    )
    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRES_MINUTES * 60 * 1000)
    await client.query(
      `INSERT INTO email_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [normalizedEmail, code, expiresAt]
    )

    if (isEmailConfigured()) {
      const { sent, error } = await sendVerificationCodeEmail(normalizedEmail, code)
      if (!sent) console.error('Verification code email failed:', error)
    }

    const payload = {
      success: true,
      message: 'Check your email for the 6-digit verification code. Account will be created after verification.',
      redirectTo: '/verify',
      email: normalizedEmail,
    }
    if (!isEmailConfigured()) payload.code = code
    res.status(201).json(payload)
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  } finally {
    client.release()
  }
})

// — ĐĂNG NHẬP (TRẢ JWT + USER)
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' })
  }
  const client = await pool.connect()
  try {
    const row = await client.query(
      `SELECT l.id AS login_id, l.email, l.password_hash, l.status, l.role, up.id AS profile_id, up.name, up.locale, up.avatar_url,
              COALESCE((SELECT SUM(ct.amount) FROM credit_transactions ct WHERE ct.user_id = up.id), 0)::int AS credit_balance
       FROM logins l
       JOIN user_profiles up ON up.login_id = l.id
       WHERE l.email = $1`,
      [email.trim().toLowerCase()]
    )
    if (row.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const login = row.rows[0]
    if (login.status === 'pending_verify') {
      return res.status(403).json({ error: 'Email not verified', code: 'PENDING_VERIFY' })
    }
    if (login.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' })
    }
    const match = await bcrypt.compare(password, login.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    await client.query('UPDATE logins SET last_login_at = NOW() WHERE id = $1', [login.login_id])
    try {
      await logActivity(pool, {
        userId: login.profile_id,
        action: 'login',
        entityType: 'session',
        entityId: null,
        details: {},
        severity: 'info',
        ipAddress: clientIp(req),
      })
    } catch (logErr) {
      console.error('Login activity log error:', logErr)
    }
    const token = signToken({ loginId: login.login_id, profileId: login.profile_id, email: login.email })
    res.json({
      success: true,
      token,
      user: {
        id: login.profile_id,
        email: login.email,
        name: login.name,
        locale: login.locale || 'en',
        avatarUrl: login.avatar_url || null,
        creditBalance: login.credit_balance ?? 0,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  } finally {
    client.release()
  }
})

// — LẤY THÔNG TIN USER HIỆN TẠI (TẤT CẢ FIELDS CHO PROFILE PAGE)
router.get('/me', requireAuth, async (req, res) => {
  const { profileId } = req.auth
  const client = await pool.connect()
  try {
    // Lấy tất cả thông tin profile + email từ logins
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
         l.email AS login_email,
         COALESCE((SELECT SUM(ct.amount) FROM credit_transactions ct WHERE ct.user_id = up.id), 0)::int AS credit_balance
       FROM user_profiles up
       JOIN logins l ON l.id = up.login_id
       WHERE up.id = $1`,
      [profileId]
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
        avatarUrl: u.avatar_url || null,
        address: u.address || '',
        city: u.city || '',
        district: u.district || '',
        country: u.country || 'Vietnam',
        postalCode: u.postal_code || '',
        dateOfBirth: u.date_of_birth || null,
        gender: u.gender || '',
        companyName: u.company_name || '',
        bio: u.bio || '',
        timezone: u.timezone || 'Asia/Ho_Chi_Minh',
        locale: u.locale || 'vi',
        emailContact: u.email_contact || '',
        loginEmail: u.login_email,
        createdAt: u.created_at,
        creditBalance: u.credit_balance ?? 0,
      },
    })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Failed to load user' })
  } finally {
    client.release()
  }
})

// — NHẬT KÝ HOẠT ĐỘNG (cho Dashboard Activity log)
router.get('/me/activity', requireAuth, async (req, res) => {
  const { profileId } = req.auth
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT action, entity_type, entity_id, details, severity, created_at
       FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    )
    res.json({ activity: result.rows })
  } catch (err) {
    console.error('Activity log error:', err)
    res.status(500).json({ error: 'Failed to load activity' })
  } finally {
    client.release()
  }
})

// — NHẬT KÝ TRUY CẬP (đăng nhập: IP + thời gian; bảng activity_logs action = login)
router.get('/me/access-log', requireAuth, async (req, res) => {
  const { profileId } = req.auth
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT ip_address, created_at
       FROM activity_logs
       WHERE user_id = $1 AND action = 'login'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    )
    res.json({ access: result.rows })
  } catch (err) {
    console.error('Access log error:', err)
    res.status(500).json({ error: 'Failed to load access log' })
  } finally {
    client.release()
  }
})

// — CẬP NHẬT THÔNG TIN PROFILE
router.put('/me', requireAuth, async (req, res) => {
  const { profileId } = req.auth
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

  // Validate: name là bắt buộc
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' })
  }

  // Validate: locale chỉ được 'vi' hoặc 'en'
  if (locale && !['vi', 'en'].includes(locale)) {
    return res.status(400).json({ error: 'Locale must be vi or en' })
  }

  const client = await pool.connect()
  try {
    // Cập nhật tất cả fields
    await client.query(
      `UPDATE user_profiles SET
         name = $1,
         phone = $2,
         avatar_url = $3,
         address = $4,
         city = $5,
         district = $6,
         country = $7,
         postal_code = $8,
         date_of_birth = $9,
         gender = $10,
         company_name = $11,
         bio = $12,
         timezone = $13,
         locale = $14,
         email_contact = $15,
         updated_at = NOW()
       WHERE id = $16`,
      [
        name.trim(),
        phone || null,
        avatarUrl || null,
        address || null,
        city || null,
        district || null,
        country || 'Vietnam',
        postalCode || null,
        dateOfBirth || null,
        gender || null,
        companyName || null,
        bio || null,
        timezone || 'Asia/Ho_Chi_Minh',
        locale || 'vi',
        emailContact || null,
        profileId,
      ]
    )

    res.json({ success: true, message: 'Profile updated successfully' })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  } finally {
    client.release()
  }
})

// — ĐỔI MẬT KHẨU (2 BƯỚC: YÊU CẦU + XÁC NHẬN BẰNG MÃ EMAIL)

// Bước 1: gửi yêu cầu đổi mật khẩu, kiểm tra mật khẩu hiện tại và gửi mã 6 số qua email
router.post('/change-password/request', requireAuth, async (req, res) => {
  const { loginId } = req.auth
  const { currentPassword, newPassword } = req.body || {}

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  const client = await pool.connect()
  try {
    const row = await client.query(
      'SELECT email, password_hash FROM logins WHERE id = $1',
      [loginId]
    )
    if (row.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const { email, password_hash: passwordHash } = row.rows[0]

    const match = await bcrypt.compare(currentPassword, passwordHash)
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRES_MINUTES * 60 * 1000)

    await client.query(
      `INSERT INTO email_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [email, code, expiresAt]
    )

    if (isEmailConfigured()) {
      const { sent, error } = await sendVerificationCodeEmail(email, code)
      if (!sent) console.error('Change password code email failed:', error)
    }

    const atIndex = email.indexOf('@')
    const emailMasked =
      atIndex > 1 ? `${email[0]}***${email.slice(atIndex - 1)}` : email

    const payload = {
      success: true,
      message: 'A verification code was sent to your email.',
      emailMasked,
    }
    if (!isEmailConfigured()) payload.code = code

    res.json(payload)
  } catch (err) {
    console.error('Change password request error:', err)
    res.status(500).json({ error: 'Failed to request password change' })
  } finally {
    client.release()
  }
})

// Bước 2: xác nhận mã 6 số và cập nhật mật khẩu mới
router.post('/change-password/confirm', requireAuth, async (req, res) => {
  const { loginId } = req.auth
  const { code, newPassword } = req.body || {}

  if (!code || !newPassword) {
    return res.status(400).json({ error: 'Verification code and new password are required' })
  }
  if (String(code).trim().length !== 6) {
    return res.status(400).json({ error: 'Code must be 6 digits' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  const client = await pool.connect()
  try {
    const loginRow = await client.query(
      'SELECT email FROM logins WHERE id = $1',
      [loginId]
    )
    if (loginRow.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const email = loginRow.rows[0].email
    const codeStr = String(code).trim().replace(/\s/g, '')

    const codeRow = await client.query(
      `SELECT id FROM email_verification_codes
       WHERE email = $1 AND code = $2 AND expires_at > NOW()`,
      [email, codeStr]
    )
    if (codeRow.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await client.query(
      'UPDATE logins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, loginId]
    )
    await client.query(
      'DELETE FROM email_verification_codes WHERE email = $1',
      [email]
    )

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) {
    console.error('Change password confirm error:', err)
    res.status(500).json({ error: 'Failed to confirm password change' })
  } finally {
    client.release()
  }
})

// — XÁC THỰC EMAIL: TẠO LOGIN + PROFILE TỪ PENDING, XOÁ PENDING VÀ CODE
router.post('/verify', async (req, res) => {
  const { email, code } = req.body || {}
  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or verification code' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const codeStr = String(code).trim().replace(/\s/g, '')
  if (codeStr.length !== 6 || !/^\d{6}$/.test(codeStr)) {
    return res.status(400).json({ error: 'Code must be 6 digits' })
  }
  const client = await pool.connect()
  try {
    const codeRow = await client.query(
      `SELECT id FROM email_verification_codes
       WHERE email = $1 AND code = $2 AND expires_at > NOW()`,
      [normalizedEmail, codeStr]
    )
    if (codeRow.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }
    const pending = await client.query(
      'SELECT password_hash, name FROM pending_registrations WHERE email = $1',
      [normalizedEmail]
    )
    if (pending.rows.length === 0) {
      return res.status(400).json({ error: 'Registration expired or invalid. Please register again.' })
    }
    const { password_hash: passwordHash, name: userName } = pending.rows[0]
    await client.query('BEGIN')
    try {
      const loginResult = await client.query(
        `INSERT INTO logins (email, password_hash, status) VALUES ($1, $2, 'active') RETURNING id`,
        [normalizedEmail, passwordHash]
      )
      const loginId = loginResult.rows[0].id
      const profileResult = await client.query(
        'INSERT INTO user_profiles (login_id, name) VALUES ($1, $2) RETURNING id',
        [loginId, userName || '']
      )
      const profileId = profileResult.rows[0].id
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, type, reference_type, reference_id, description)
         VALUES ($1, $2, 'bonus', 'signup_bonus', $3, 'Welcome bonus')`,
        [profileId, SIGNUP_CREDIT_BONUS, String(loginId)]
      )
      await client.query('DELETE FROM pending_registrations WHERE email = $1', [normalizedEmail])
      await client.query('DELETE FROM email_verification_codes WHERE email = $1', [normalizedEmail])
      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    }
    res.json({ success: true, message: 'Email verified. You can now log in.', redirectTo: '/login' })
  } catch (err) {
    console.error('Verify error:', err)
    res.status(500).json({ error: 'Verification failed' })
  } finally {
    client.release()
  }
})

// — GỬI LẠI MÃ XÁC THỰC (CHỈ KHI CÓ PENDING REGISTRATION)
router.post('/resend-verify-code', async (req, res) => {
  const { email } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const client = await pool.connect()
  try {
    const pendingRow = await client.query(
      'SELECT id FROM pending_registrations WHERE email = $1',
      [normalizedEmail]
    )
    if (pendingRow.rows.length === 0) {
      return res.json({ success: true, message: 'If the email is unverified, a new code was sent.' })
    }
    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRES_MINUTES * 60 * 1000)
    await client.query(
      `INSERT INTO email_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
      [normalizedEmail, code, expiresAt]
    )
    if (isEmailConfigured()) {
      const { sent, error } = await sendVerificationCodeEmail(normalizedEmail, code)
      if (!sent) console.error('Resend verification code failed:', error)
    }
    const payload = { success: true, message: 'A new verification code was sent.' }
    if (!isEmailConfigured()) payload.code = code
    res.json(payload)
  } finally {
    client.release()
  }
})

// — QUÊN MẬT KHẨU (GỬI LINK RESET QUA EMAIL)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }
  const client = await pool.connect()
  try {
    const r = await client.query('SELECT id FROM logins WHERE email = $1', [email.trim().toLowerCase()])
    if (r.rows.length === 0) {
      // KHÔNG TIẾT LỘ EMAIL CÓ TỒN TẠI HAY KHÔNG
      return res.json({ success: true, message: 'If the email exists, a reset link was sent.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const resetToken = signToken(
      { email: normalizedEmail, purpose: 'reset_password' },
      RESET_TOKEN_EXPIRES
    )
    const resetLink = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetToken}`

    if (isEmailConfigured()) {
      const { sent, error } = await sendResetPasswordEmail(normalizedEmail, resetLink)
      if (!sent) console.error('Reset password email failed:', error)
    }

    const payload = { success: true, message: 'If the email exists, a reset link was sent.' }
    if (!isEmailConfigured()) payload.resetLink = resetLink
    res.json(payload)
  } finally {
    client.release()
  }
})

// — ĐẶT LẠI MẬT KHẨU (BODY: TOKEN TỪ LINK, NEWPASSWORD)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {}
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid token or password (min 6 characters)' })
  }
  const decoded = verifyToken(token)
  if (!decoded || decoded.purpose !== 'reset_password') {
    return res.status(400).json({ error: 'Invalid or expired reset link' })
  }
  const client = await pool.connect()
  try {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    const r = await client.query(
      'UPDATE logins SET password_hash = $1 WHERE email = $2 RETURNING id',
      [passwordHash, decoded.email]
    )
    if (r.rowCount === 0) {
      return res.status(400).json({ error: 'User not found' })
    }
    res.json({ success: true, message: 'Password updated', redirectTo: '/login' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Reset failed' })
  } finally {
    client.release()
  }
})

// ============================================================
// API TẠM THỜI CHO TEST - XÓA SAU KHI TEST XONG
// ============================================================

// — DANH SÁCH USER (CHỈ ID VÀ NAME) - CHO TEST
router.get('/users', async (req, res) => {
  const client = await pool.connect()
  try {
    const rows = await client.query(
      `SELECT up.id, up.name, l.email 
       FROM user_profiles up 
       JOIN logins l ON l.id = up.login_id 
       ORDER BY up.created_at DESC`
    )
    res.json({
      success: true,
      users: rows.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
      })),
    })
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Failed to list users' })
  } finally {
    client.release()
  }
})

// — XÓA USER THEO ID - CHO TEST (XÓA CẢ LOGIN VÀ PROFILE)
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ error: 'Missing user id' })
  }
  const client = await pool.connect()
  try {
    // Tìm login_id từ profile
    const profile = await client.query(
      'SELECT login_id FROM user_profiles WHERE id = $1',
      [id]
    )
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const loginId = profile.rows[0].login_id

    // Xóa login (cascade sẽ xóa profile theo)
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
