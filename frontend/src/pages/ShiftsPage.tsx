import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMonthlyShifts, saveShifts } from '../api/shifts'
import { listShiftTypes } from '../api/shiftTypes'
import { useCurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import type { ShiftBulkItem } from '../types/shift'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 月間シフト表(トップページ)。管理者はパレット方式で編集、職員は閲覧のみ。 */
export function ShiftsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1〜12

  // パレットで選択中の勤務区分。'clear' はセルを空に戻すモード
  const [selectedTypeId, setSelectedTypeId] = useState<number | 'clear' | null>(null)
  // 未保存の編集: "userId:YYYY-MM-DD" → shift_type_id(null = 削除)
  const [edits, setEdits] = useState<Record<string, number | null>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  const { data: monthly, isLoading } = useQuery({
    queryKey: ['shifts', year, month],
    queryFn: () => getMonthlyShifts(year, month),
  })
  const { data: shiftTypes } = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: listShiftTypes,
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

  const typeById = new Map(shiftTypes?.map((t) => [t.id, t]))

  // サーバー保存済みの割り当て
  const baseline = new Map(monthly?.shifts.map((s) => [`${s.user_id}:${s.work_date}`, s.shift_type_id]))

  const cellValue = (key: string): number | null =>
    key in edits ? edits[key] : (baseline.get(key) ?? null)

  const editCount = Object.keys(edits).length

  const changeMonth = (delta: number) => {
    if (editCount > 0 && !window.confirm('未保存の変更があります。破棄して月を移動しますか?')) {
      return
    }
    setEdits({})
    setErrorMessage(null)
    const moved = new Date(year, month - 1 + delta, 1)
    setYear(moved.getFullYear())
    setMonth(moved.getMonth() + 1)
  }

  const handleCellClick = (userId: number, dateStr: string) => {
    if (!isAdmin || selectedTypeId === null) return
    const key = `${userId}:${dateStr}`
    const newValue = selectedTypeId === 'clear' ? null : selectedTypeId
    const serverValue = baseline.get(key) ?? null
    setEdits((prev) => {
      const next = { ...prev }
      if (newValue === serverValue) {
        // サーバーと同じ値に戻したら「未保存の変更」から外す
        delete next[key]
      } else {
        next[key] = newValue
      }
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const items: ShiftBulkItem[] = Object.entries(edits).map(([key, shiftTypeId]) => {
        const [userId, workDate] = key.split(':')
        return { user_id: Number(userId), work_date: workDate, shift_type_id: shiftTypeId }
      })
      return saveShifts(items)
    },
    onSuccess: () => {
      setEdits({})
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof ApiError ? error.message : '保存に失敗しました')
    },
  })

  if (isLoading) {
    return <p className="text-gray-500">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">シフト表</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            aria-label="前の月"
          >
            ◀
          </button>
          <span className="min-w-28 text-center font-medium text-gray-800">
            {year}年{month}月
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            aria-label="次の月"
          >
            ▶
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow">
          <span className="mr-1 text-sm text-gray-600">入力する区分:</span>
          {shiftTypes?.map((shiftType) => (
            <button
              key={shiftType.id}
              onClick={() => setSelectedTypeId(shiftType.id)}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm ${
                selectedTypeId === shiftType.id
                  ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: shiftType.color }} />
              {shiftType.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedTypeId('clear')}
            className={`rounded border px-2.5 py-1 text-sm ${
              selectedTypeId === 'clear'
                ? 'border-red-500 bg-red-50 font-medium text-red-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✕ クリア
          </button>

          <div className="ml-auto flex items-center gap-3">
            {editCount > 0 && <span className="text-sm text-amber-600">未保存: {editCount} 件</span>}
            <button
              onClick={() => {
                setEdits({})
                setErrorMessage(null)
              }}
              disabled={editCount === 0}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              破棄
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={editCount === 0 || saveMutation.isPending}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {saveMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {isAdmin && selectedTypeId === null && (
        <p className="text-sm text-gray-500">
          上のパレットから勤務区分を選び、表のセルをクリックすると入力できます。
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                職員
              </th>
              {days.map((day) => {
                const weekday = new Date(year, month - 1, day).getDay()
                const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
                const weekendClass =
                  weekday === 0 ? 'bg-red-50 text-red-600' : weekday === 6 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                return (
                  <th
                    key={day}
                    className={`border-b px-1 py-1.5 text-center font-normal ${weekendClass} ${
                      dateStr === todayStr ? 'outline outline-2 -outline-offset-2 outline-amber-400' : ''
                    }`}
                  >
                    <div className="text-xs font-medium">{day}</div>
                    <div className="text-[10px]">{WEEKDAY_LABELS[weekday]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {monthly?.users.map((user) => (
              <tr key={user.id}>
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r bg-white px-3 py-1.5 text-gray-800">
                  {user.name}
                </td>
                {days.map((day) => {
                  const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
                  const key = `${user.id}:${dateStr}`
                  const value = cellValue(key)
                  const shiftType = value !== null ? typeById.get(value) : undefined
                  const isEdited = key in edits
                  const weekday = new Date(year, month - 1, day).getDay()
                  return (
                    <td
                      key={day}
                      onClick={() => handleCellClick(user.id, dateStr)}
                      className={`h-9 min-w-9 border-b px-0.5 text-center ${
                        weekday === 0 ? 'bg-red-50/50' : weekday === 6 ? 'bg-blue-50/50' : ''
                      } ${isAdmin && selectedTypeId !== null ? 'cursor-pointer hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-blue-400' : ''} ${
                        isEdited ? 'outline outline-2 -outline-offset-2 outline-amber-400' : ''
                      }`}
                    >
                      {shiftType && (
                        <span
                          className="inline-block w-7 rounded py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: shiftType.color }}
                        >
                          {shiftType.short_label}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {monthly?.users.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">有効な職員が登録されていません。</p>
        )}
      </div>
    </div>
  )
}
