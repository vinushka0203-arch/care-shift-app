import { useQuery } from '@tanstack/react-query'
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

/** ログイン中ユーザーの取得クエリ(キャッシュは画面間で共有される)。 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  })
}
