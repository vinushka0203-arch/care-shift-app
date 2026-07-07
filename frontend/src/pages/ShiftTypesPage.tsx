import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listShiftTypes, createShiftType, updateShiftType } from '../api/shiftTypes'
import { ApiError } from '../api/client'
import type { ShiftType } from '../types/shiftType'

interface FormState {
  name: string
  short_label: string
  start_time: string
  end_time: string
  color: string
  is_work: boolean
  sort_order: number
}

const emptyForm: FormState = {
  name: '',
  short_label: '',
  start_time: '09:00',
  end_time: '18:00',
  color: '#3b82f6',
  is_work: true,
  sort_order: 0,
}

const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

/** "HH:MM:SS" を "HH:MM" にして表示する。 */
function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : ''
}

/** 勤務区分管理ページ(管理者専用)。一覧・追加・編集を行う。 */
export function ShiftTypesPage() {
  const queryClient = useQueryClient()
  const { data: shiftTypes, isLoading } = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: listShiftTypes,
  })

  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isNew = editingId === 'new'

  const openNewForm = () => {
    setForm({ ...emptyForm, sort_order: (shiftTypes?.length ?? 0) + 1 })
    setErrorMessage(null)
    setEditingId('new')
  }

  const openEditForm = (shiftType: ShiftType) => {
    setForm({
      name: shiftType.name,
      short_label: shiftType.short_label,
      start_time: formatTime(shiftType.start_time) || '09:00',
      end_time: formatTime(shiftType.end_time) || '18:00',
      color: shiftType.color,
      is_work: shiftType.is_work,
      sort_order: shiftType.sort_order,
    })
    setErrorMessage(null)
    setEditingId(shiftType.id)
  }

  const closeForm = () => {
    setEditingId(null)
    setErrorMessage(null)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input = {
        name: form.name,
        short_label: form.short_label,
        // 休みの区分は時刻を持たない
        start_time: form.is_work ? form.start_time : null,
        end_time: form.is_work ? form.end_time : null,
        color: form.color,
        is_work: form.is_work,
        sort_order: form.sort_order,
      }
      return isNew ? createShiftType(input) : updateShiftType(editingId as number, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftTypes'] })
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
        <h2 className="text-xl font-bold text-gray-800">勤務区分管理</h2>
        <button
          onClick={openNewForm}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 勤務区分を追加
        </button>
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 font-bold text-gray-800">
            {isNew ? '勤務区分の追加' : `「${form.name}」の編集`}
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="st-name" className={labelClass}>
                名前(例: 早番)
              </label>
              <input
                id="st-name"
                type="text"
                required
                maxLength={50}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="st-label" className={labelClass}>
                短縮ラベル(例: 早)
              </label>
              <input
                id="st-label"
                type="text"
                required
                maxLength={10}
                value={form.short_label}
                onChange={(e) => setForm({ ...form, short_label: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_work}
                  onChange={(e) => setForm({ ...form, is_work: e.target.checked })}
                />
                勤務(オフ = 休み扱い)
              </label>
            </div>

            <div>
              <label htmlFor="st-start" className={labelClass}>
                開始時刻
              </label>
              <input
                id="st-start"
                type="time"
                required={form.is_work}
                disabled={!form.is_work}
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="st-end" className={labelClass}>
                終了時刻
              </label>
              <input
                id="st-end"
                type="time"
                required={form.is_work}
                disabled={!form.is_work}
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="st-order" className={labelClass}>
                並び順
              </label>
              <input
                id="st-order"
                type="number"
                required
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="st-color" className={labelClass}>
                表示色
              </label>
              <input
                id="st-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-16 cursor-pointer rounded border border-gray-300"
              />
            </div>
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
              <th className="px-4 py-3">並び順</th>
              <th className="px-4 py-3">区分</th>
              <th className="px-4 py-3">短縮</th>
              <th className="px-4 py-3">時間帯</th>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shiftTypes?.map((shiftType) => (
              <tr key={shiftType.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{shiftType.sort_order}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: shiftType.color }}
                  >
                    {shiftType.name}
                  </span>
                </td>
                <td className="px-4 py-3">{shiftType.short_label}</td>
                <td className="px-4 py-3">
                  {shiftType.is_work
                    ? `${formatTime(shiftType.start_time)} 〜 ${formatTime(shiftType.end_time)}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{shiftType.is_work ? '勤務' : '休み'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEditForm(shiftType)}
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
