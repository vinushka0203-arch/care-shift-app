import { apiFetch } from './client'
import type { User } from '../types/user'

export interface UserCreateInput {
  name: string
  email: string
  password: string
  role: 'admin' | 'staff'
  employment_type: 'full_time' | 'part_time'
}

export interface UserUpdateInput {
  name?: string
  password?: string
  role?: 'admin' | 'staff'
  employment_type?: 'full_time' | 'part_time'
  is_active?: boolean
}

/** 全職員の一覧を取得する(管理者のみ)。 */
export function listUsers(): Promise<User[]> {
  return apiFetch<User[]>('/api/users')
}

/** 職員を新規登録する(管理者のみ)。 */
export function createUser(input: UserCreateInput): Promise<User> {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 職員情報を部分更新する(管理者のみ)。 */
export function updateUser(id: number, input: UserUpdateInput): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
