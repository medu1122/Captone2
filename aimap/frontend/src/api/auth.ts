import { apiFetch } from './client'

const AUTH_PREFIX = '/api/auth'

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export interface RegisterResponse {
  success: boolean
  message?: string
  redirectTo?: string
  email?: string
  code?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  user?: { id: string; email: string; name: string; locale?: string }
  redirectTo?: string
}

export interface VerifyPayload {
  token?: string
  email?: string
  code?: string
}

export interface VerifyResponse {
  success: boolean
  message?: string
  redirectTo?: string
}

export interface ResendVerifyCodePayload {
  email: string
}

export interface ResendVerifyCodeResponse {
  success: boolean
  message?: string
  code?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message?: string
  resetLink?: string
}

export interface ResetPasswordPayload {
  token: string
  newPassword: string
}

export interface ResetPasswordResponse {
  success: boolean
  message?: string
  redirectTo?: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiFetch<RegisterResponse>(`${AUTH_PREFIX}/register`, { method: 'POST', body: payload }),

  login: (payload: LoginPayload) =>
    apiFetch<LoginResponse>(`${AUTH_PREFIX}/login`, { method: 'POST', body: payload }),

  verify: (payload: VerifyPayload) =>
    apiFetch<VerifyResponse>(`${AUTH_PREFIX}/verify`, { method: 'POST', body: payload }),

  resendVerifyCode: (payload: ResendVerifyCodePayload) =>
    apiFetch<ResendVerifyCodeResponse>(`${AUTH_PREFIX}/resend-verify-code`, { method: 'POST', body: payload }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiFetch<ForgotPasswordResponse>(`${AUTH_PREFIX}/forgot-password`, { method: 'POST', body: payload }),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiFetch<ResetPasswordResponse>(`${AUTH_PREFIX}/reset-password`, { method: 'POST', body: payload }),
}
