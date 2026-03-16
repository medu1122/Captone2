import { apiFetch } from './client'

// Path relative to API_BASE: prod uses base /api, dev uses http://localhost:4111/api
const AUTH_PREFIX = '/auth'

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

export interface AuthUser {
  id: string
  email: string
  name: string
  locale?: string
  avatarUrl?: string | null
  // Extended profile fields (from /auth/me)
  phone?: string
  address?: string
  city?: string
  district?: string
  country?: string
  postalCode?: string
  dateOfBirth?: string | null
  gender?: string
  companyName?: string
  bio?: string
  timezone?: string
  emailContact?: string
  loginEmail?: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  user?: AuthUser
  redirectTo?: string
}

export interface MeResponse {
  success: boolean
  user?: AuthUser
}

export interface ChangePasswordRequestPayload {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordRequestResponse {
  success: boolean
  message?: string
  emailMasked?: string
  code?: string
}

export interface ChangePasswordConfirmPayload {
  code: string
  newPassword: string
}

export interface ChangePasswordConfirmResponse {
  success: boolean
  message?: string
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

  me: (token: string) =>
    apiFetch<MeResponse>(`${AUTH_PREFIX}/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateMe: (token: string, body: Partial<AuthUser> & { name: string }) =>
    apiFetch<{ success: boolean; message?: string; error?: string }>(`${AUTH_PREFIX}/me`, {
      method: 'PUT',
      body,
      headers: { Authorization: `Bearer ${token}` },
    }),

  changePasswordRequest: (token: string, payload: ChangePasswordRequestPayload) =>
    apiFetch<ChangePasswordRequestResponse>(`${AUTH_PREFIX}/change-password/request`, {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    }),

  changePasswordConfirm: (token: string, payload: ChangePasswordConfirmPayload) =>
    apiFetch<ChangePasswordConfirmResponse>(`${AUTH_PREFIX}/change-password/confirm`, {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    }),
}
