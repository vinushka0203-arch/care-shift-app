import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../api/auth'
import { clearToken } from '../api/client'

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  staff: '職員',
}

/** トップ画面。ログイン中のユーザー情報を表示する。未認証(トークン失効含む)なら /login へ。 */
export function HomePage() {
  const navigate = useNavigate()

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  })

  useEffect(() => {
    if (isError) {
      clearToken()
      navigate('/login', { replace: true })
    }
  }, [isError, navigate])

  const handleLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (isError || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
        <h1 className="text-lg font-bold text-gray-800">介護施設シフト管理</h1>
        <button
          onClick={handleLogout}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        >
          ログアウト
        </button>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">ようこそ</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{user.name} さん</p>
          <p className="mt-2 inline-block rounded bg-blue-50 px-2 py-1 text-sm text-blue-700">
            {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
      </main>
    </div>
  )
}
