/**
 * SMTP email service – verify link & reset password link.
 * Env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, FRONTEND_URL.
 */
import nodemailer from 'nodemailer'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function getTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  })
}

/** @returns {boolean} true if SMTP is configured */
export function isEmailConfigured() {
  return getTransporter() !== null
}

/**
 * Send verification email with link.
 * @param {string} to - recipient email
 * @param {string} verificationLink - full URL to /verify?token=...
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function sendVerificationEmail(to, verificationLink) {
  const transport = getTransporter()
  if (!transport) {
    return { sent: false, error: 'SMTP not configured' }
  }
  const from = process.env.MAIL_FROM || 'AIMAP <noreply@aimap.app>'
  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Verify your AIMAP account',
      text: `Verify your email by opening this link:\n\n${verificationLink}\n\nLink expires in 24 hours.`,
      html: `
        <p>Welcome to AIMAP. Please verify your email by clicking the link below:</p>
        <p><a href="${verificationLink}">Verify my email</a></p>
        <p>Link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      `,
    })
    return { sent: true }
  } catch (err) {
    console.error('Send verification email error:', err)
    return { sent: false, error: err.message }
  }
}

/**
 * Send reset password email with link.
 * @param {string} to - recipient email
 * @param {string} resetLink - full URL to /reset-password?token=...
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function sendResetPasswordEmail(to, resetLink) {
  const transport = getTransporter()
  if (!transport) {
    return { sent: false, error: 'SMTP not configured' }
  }
  const from = process.env.MAIL_FROM || 'AIMAP <noreply@aimap.app>'
  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Reset your AIMAP password',
      text: `Reset your password by opening this link:\n\n${resetLink}\n\nLink expires in 1 hour.`,
      html: `
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetLink}">Reset password</a></p>
        <p>Link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    })
    return { sent: true }
  } catch (err) {
    console.error('Send reset password email error:', err)
    return { sent: false, error: err.message }
  }
}

export { FRONTEND_URL }
