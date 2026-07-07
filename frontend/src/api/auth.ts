import { apiFetch } from './client'
import type { User } from '../types/user'

interface LoginResponse {
  access_token: string
  token_type: string
}

/** メールアドレスとパスワードでログインし、JWT を取得する。 */
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** 自分の情報を取得する。 */
export function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/api/users/me')
}
