import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client'

/** トークンが無ければ /login へリダイレクトする認証ガード。 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = getToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}
