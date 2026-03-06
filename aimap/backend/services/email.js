/**
 * SERVICE GỬI EMAIL QUA SMTP — MÃ XÁC THỰC 6 SỐ VÀ LINK ĐẶT LẠI MẬT KHẨU.
 * ENV: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, FRONTEND_URL.
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

/** TRẢ VỀ TRUE NẾU ĐÃ CẤU HÌNH SMTP */
export function isEmailConfigured() {
  return getTransporter() !== null
}

/**
 * GỬI EMAIL CHỨA MÃ XÁC THỰC 6 SỐ (KHÔNG GỬI LINK).
 * @param {string} to — email người nhận
 * @param {string} code — mã 6 số
 */
export async function sendVerificationCodeEmail(to, code) {
  const transport = getTransporter()
  if (!transport) {
    return { sent: false, error: 'SMTP not configured' }
  }
  const from = process.env.MAIL_FROM || 'AIMAP <noreply@aimap.app>'
  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Your AIMAP verification code',
      text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes. If you didn't create an account, you can ignore this email.`,
      html: `
        <p>Your AIMAP verification code is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
        <p>This code expires in 15 minutes. If you didn't create an account, you can ignore this email.</p>
      `,
    })
    return { sent: true }
  } catch (err) {
    console.error('Send verification code email error:', err)
    return { sent: false, error: err.message }
  }
}

/**
 * GỬI EMAIL CHỨA LINK ĐẶT LẠI MẬT KHẨU.
 * @param {string} to — email người nhận
 * @param {string} resetLink — URL đầy đủ /reset-password?token=...
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
