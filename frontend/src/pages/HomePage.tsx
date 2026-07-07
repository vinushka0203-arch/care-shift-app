import { useCurrentUser } from '../api/auth'

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  staff: '職員',
}

/** トップ画面。ログイン中のユーザー情報を表示する(ヘッダーは Layout が担当)。 */
export function HomePage() {
  const { data: user } = useCurrentUser()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-sm text-gray-500">ようこそ</p>
        <p className="mt-1 text-2xl font-bold text-gray-800">{user.name} さん</p>
        <p className="mt-2 inline-block rounded bg-blue-50 px-2 py-1 text-sm text-blue-700">
          {ROLE_LABELS[user.role] ?? user.role}
        </p>
      </div>
    </div>
  )
}
