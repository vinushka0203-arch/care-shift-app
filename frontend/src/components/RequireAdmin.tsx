import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../api/auth'

/** 管理者専用ページのガード。管理者以外はトップへリダイレクトする。 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return null
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
