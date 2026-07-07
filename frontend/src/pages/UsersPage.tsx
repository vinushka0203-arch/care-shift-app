import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listUsers, createUser, updateUser } from '../api/users'
import { ApiError } from '../api/client'
import type { User } from '../types/user'

const ROLE_LABELS: Record<string, string> = { admin: '管理者', staff: '職員' }
const EMPLOYMENT_LABELS: Record<string, string> = { full_time: '常勤', part_time: '非常勤' }

interface FormState {
  name: string
  email: string
  password: string
  role: 'admin' | 'staff'
  employment_type: 'full_time' | 'part_time'
  is_active: boolean
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'staff',
  employment_type: 'full_time',
  is_active: true,
}

const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

/** 職員管理ページ(管理者専用)。一覧・新規登録・編集を行う。 */
export function UsersPage() {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: listUsers })

  // 'new' = 新規登録フォーム、number = その id の職員を編集中、null = フォーム非表示
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isNew = editingId === 'new'

  const openNewForm = () => {
    setForm(emptyForm)
    setErrorMessage(null)
    setEditingId('new')
  }

  const openEditForm = (user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      employment_type: user.employment_type,
      is_active: user.is_active,
    })
    setErrorMessage(null)
    setEditingId(user.id)
  }

  const closeForm = () => {
    setEditingId(null)
    setErrorMessage(null)
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (isNew) {
        return createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          employment_type: form.employment_type,
        })
      }
      return updateUser(editingId as number, {
        name: form.name,
        role: form.role,
        employment_type: form.employment_type,
        is_active: form.is_active,
        // パスワードは入力されたときだけ変更する
        ...(form.password ? { password: form.password } : {}),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      closeForm()
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof ApiError ? error.message : '保存に失敗しました')
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    mutation.mutate()
  }

  if (isLoading) {
    return <p className="text-gray-500">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">職員管理</h2>
        <button
          onClick={openNewForm}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 職員を登録
        </button>
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 font-bold text-gray-800">
            {isNew ? '職員の新規登録' : `${form.name} さんの編集`}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="user-name" className={labelClass}>
                名前
              </label>
              <input
                id="user-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="user-email" className={labelClass}>
                メールアドレス{!isNew && '(変更不可)'}
              </label>
              <input
                id="user-email"
                type="email"
                required
                disabled={!isNew}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="user-password" className={labelClass}>
                パスワード{isNew ? '(8文字以上)' : '(変更する場合のみ入力)'}
              </label>
              <input
                id="user-password"
                type="password"
                required={isNew}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="user-role" className={labelClass}>
                ロール
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as FormState['role'] })}
                className={inputClass}
              >
                <option value="staff">職員</option>
                <option value="admin">管理者</option>
              </select>
            </div>

            <div>
              <label htmlFor="user-employment" className={labelClass}>
                雇用形態
              </label>
              <select
                id="user-employment"
                value={form.employment_type}
                onChange={(e) =>
                  setForm({ ...form, employment_type: e.target.value as FormState['employment_type'] })
                }
                className={inputClass}
              >
                <option value="full_time">常勤</option>
                <option value="part_time">非常勤</option>
              </select>
            </div>

            {!isNew && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  有効(オフにするとログインできなくなります)
                </label>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">メールアドレス</th>
              <th className="px-4 py-3">ロール</th>
              <th className="px-4 py-3">雇用形態</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className={`border-b last:border-b-0 ${user.is_active ? '' : 'text-gray-400'}`}>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[user.role] ?? user.role}</td>
                <td className="px-4 py-3">{EMPLOYMENT_LABELS[user.employment_type] ?? user.employment_type}</td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">有効</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">無効</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEditForm(user)}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
