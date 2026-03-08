/**
 * ROUTES AUTH — KHỚP READ_CONTEXT/DATABASE_DESIGN.MD (LOGINS + USER_PROFILES).
 * POST /api/auth/register, login, verify, resend-verify-code, forgot-password, reset-password
 */
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/index.js'
import {
  sendVerificationCodeEmail,
  sendResetPasswordEmail,
  isEmailConfigured,
  FRONTEND_URL,
} from '../services/email.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'aimap-dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const RESET_TOKEN_EXPIRES = '1h'
const BCRYPT_ROUNDS = 10
const VERIFY_CODE_EXPIRES_MINUTES = 15

/** SINH MÃ 6 SỐ NGẪU NHIÊN CHO XÁC THỰC EMAIL */
function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** KÝ JWT (LOGIN HOẶC RESET PASSWORD) */
function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

/** GIẢI MÃ VÀ KIỂM TRA JWT; TRẢ NULL NẾU LỖI HOẶC HẾT HẠN */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
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
      `SELECT l.id AS login_id, l.email, l.password_hash, l.status, l.role, up.id AS profile_id, up.name, up.locale
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
    const token = signToken({ loginId: login.login_id, profileId: login.profile_id, email: login.email })
    res.json({
      success: true,
      token,
      user: { id: login.profile_id, email: login.email, name: login.name, locale: login.locale || 'en' },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
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
    const loginResult = await client.query(
      `INSERT INTO logins (email, password_hash, status) VALUES ($1, $2, 'active') RETURNING id`,
      [normalizedEmail, passwordHash]
    )
    const loginId = loginResult.rows[0].id
    await client.query(
      'INSERT INTO user_profiles (login_id, name) VALUES ($1, $2)',
      [loginId, userName || '']
    )
    await client.query('DELETE FROM pending_registrations WHERE email = $1', [normalizedEmail])
    await client.query('DELETE FROM email_verification_codes WHERE email = $1', [normalizedEmail])
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

export default router
