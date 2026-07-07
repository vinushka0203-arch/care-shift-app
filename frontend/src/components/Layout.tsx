import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../api/auth'
import { clearToken } from '../api/client'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded px-3 py-1.5 text-sm',
    isActive ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-600 hover:bg-gray-100',
  ].join(' ')
}

/** 認証後の全ページ共通レイアウト。ヘッダー+ナビゲーションを表示する。 */
export function Layout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user, isLoading, isError } = useCurrentUser()

  // トークン失効などで自分の情報が取れなくなったらログインへ戻す
  useEffect(() => {
    if (isError) {
      clearToken()
      navigate('/login', { replace: true })
    }
  }, [isError, navigate])

  const handleLogout = () => {
    clearToken()
    queryClient.clear()
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
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-800">介護施設シフト管理</h1>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              トップ
            </NavLink>
            {user.role === 'admin' && (
              <>
                <NavLink to="/users" className={navLinkClass}>
                  職員管理
                </NavLink>
                <NavLink to="/shift-types" className={navLinkClass}>
                  勤務区分
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.name} さん</span>
          <button
            onClick={handleLogout}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
