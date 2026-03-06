/**
 * Auth routes – khớp READ_CONTEXT/database_design.md (logins + user_profiles).
 * POST /api/auth/register, /api/auth/login, /api/auth/verify, /api/auth/forgot-password, /api/auth/reset-password
 */
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/index.js'
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  isEmailConfigured,
  FRONTEND_URL,
} from '../services/email.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'aimap-dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const VERIFY_TOKEN_EXPIRES = '24h'
const RESET_TOKEN_EXPIRES = '1h'
const BCRYPT_ROUNDS = 10

function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing email, password, or name' })
  }
  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT id FROM logins WHERE email = $1', [email.trim().toLowerCase()])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const loginResult = await client.query(
      `INSERT INTO logins (email, password_hash, status) VALUES ($1, $2, 'pending_verify') RETURNING id`,
      [email.trim().toLowerCase(), passwordHash]
    )
    const loginId = loginResult.rows[0].id
    await client.query(
      `INSERT INTO user_profiles (login_id, name) VALUES ($1, $2)`,
      [loginId, (name || '').trim()]
    )
    const normalizedEmail = email.trim().toLowerCase()
    const verificationToken = signToken({ email: normalizedEmail, purpose: 'verify' }, VERIFY_TOKEN_EXPIRES)
    const verifyLink = `${FRONTEND_URL.replace(/\/$/, '')}/verify?token=${verificationToken}`

    if (isEmailConfigured()) {
      const { sent, error } = await sendVerificationEmail(normalizedEmail, verifyLink)
      if (!sent) console.error('Verification email failed:', error)
    }

    const payload = {
      success: true,
      message: 'Account created. Check your email to verify, or use the link below if you did not receive it.',
      redirectTo: '/verify',
    }
    if (!isEmailConfigured()) payload.verificationToken = verificationToken
    res.status(201).json(payload)
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  } finally {
    client.release()
  }
})

// POST /api/auth/login
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

// POST /api/auth/verify – body: { token } (JWT from register) or { email, code } for future OTP
router.post('/verify', async (req, res) => {
  const { token, email, code } = req.body || {}
  if (token) {
    const decoded = verifyToken(token)
    if (!decoded || decoded.purpose !== 'verify') {
      return res.status(400).json({ error: 'Invalid or expired verification link' })
    }
    const client = await pool.connect()
    try {
      const r = await client.query(
        "UPDATE logins SET status = 'active' WHERE email = $1 AND status = 'pending_verify' RETURNING id",
        [decoded.email]
      )
      if (r.rowCount === 0) {
        return res.status(400).json({ error: 'Already verified or invalid' })
      }
      res.json({ success: true, message: 'Email verified', redirectTo: '/login' })
    } catch (err) {
      console.error('Verify error:', err)
      res.status(500).json({ error: 'Verification failed' })
    } finally {
      client.release()
    }
    return
  }
  if (email && code) {
    // Optional: OTP flow when you add verification_code storage
    return res.status(400).json({ error: 'Use verification token from email link' })
  }
  res.status(400).json({ error: 'Missing token' })
})

// POST /api/auth/forgot-password – body: { email }
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }
  const client = await pool.connect()
  try {
    const r = await client.query('SELECT id FROM logins WHERE email = $1', [email.trim().toLowerCase()])
    if (r.rows.length === 0) {
      // Don't reveal whether email exists
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

// POST /api/auth/reset-password – body: { token, newPassword }
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
