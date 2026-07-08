import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createShiftRequest,
  listShiftRequests,
  updateShiftRequestStatus,
} from '../api/shiftRequests'
import { listShiftTypes } from '../api/shiftTypes'
import { useCurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import type { RequestStatus, RequestType } from '../types/shiftRequest'

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  day_off: '休み希望',
  work_preference: '勤務希望',
}

const STATUS_BADGES: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: '審査中', className: 'bg-amber-50 text-amber-700' },
  accepted: { label: '承認', className: 'bg-green-50 text-green-700' },
  rejected: { label: '却下', className: 'bg-gray-100 text-gray-500' },
}

const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

function StatusBadge({ status }: { status: RequestStatus }) {
  const badge = STATUS_BADGES[status]
  return <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>{badge.label}</span>
}

/** 希望ページ。職員は提出+自分の履歴、管理者は全員分の一覧と承認/却下。 */
export function RequestsPage() {
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 職員: 全期間の自分の希望 / 管理者: 表示月の全員分
  const { data: requests, isLoading } = useQuery({
    queryKey: isAdmin ? ['shiftRequests', year, month] : ['shiftRequests', 'own'],
    queryFn: () => (isAdmin ? listShiftRequests(year, month) : listShiftRequests()),
  })
  const { data: shiftTypes } = useQuery({ queryKey: ['shiftTypes'], queryFn: listShiftTypes })

  const typeNameById = new Map(shiftTypes?.map((t) => [t.id, t.name]))

  const [form, setForm] = useState({
    work_date: '',
    request_type: 'day_off' as RequestType,
    shift_type_id: '' as string,
    note: '',
  })
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const submitMutation = useMutation({
    mutationFn: () =>
      createShiftRequest({
        work_date: form.work_date,
        request_type: form.request_type,
        shift_type_id:
          form.request_type === 'work_preference' ? Number(form.shift_type_id) : null,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      setMessage({ kind: 'success', text: '希望を提出しました' })
      setForm({ work_date: '', request_type: 'day_off', shift_type_id: '', note: '' })
      queryClient.invalidateQueries({ queryKey: ['shiftRequests'] })
    },
    onError: (error: unknown) => {
      setMessage({
        kind: 'error',
        text: error instanceof ApiError ? error.message : '提出に失敗しました',
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'accepted' | 'rejected' }) =>
      updateShiftRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shiftRequests'] }),
    onError: (error: unknown) => {
      setMessage({
        kind: 'error',
        text: error instanceof ApiError ? error.message : '更新に失敗しました',
      })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    submitMutation.mutate()
  }

  const changeMonth = (delta: number) => {
    const moved = new Date(year, month - 1 + delta, 1)
    setYear(moved.getFullYear())
    setMonth(moved.getMonth() + 1)
  }

  if (isLoading) {
    return <p className="text-gray-500">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {isAdmin ? '希望一覧' : '希望の提出'}
        </h2>
        {isAdmin && (
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
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${message.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {!isAdmin && (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="req-date" className={labelClass}>
                日付
              </label>
              <input
                id="req-date"
                type="date"
                required
                value={form.work_date}
                onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="req-type" className={labelClass}>
                種類
              </label>
              <select
                id="req-type"
                value={form.request_type}
                onChange={(e) =>
                  setForm({ ...form, request_type: e.target.value as RequestType })
                }
                className={inputClass}
              >
                <option value="day_off">休み希望</option>
                <option value="work_preference">勤務希望</option>
              </select>
            </div>

            {form.request_type === 'work_preference' && (
              <div>
                <label htmlFor="req-shift-type" className={labelClass}>
                  希望する勤務区分
                </label>
                <select
                  id="req-shift-type"
                  required
                  value={form.shift_type_id}
                  onChange={(e) => setForm({ ...form, shift_type_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">選択してください</option>
                  {shiftTypes
                    ?.filter((t) => t.is_work)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className={form.request_type === 'work_preference' ? '' : 'sm:col-span-2'}>
              <label htmlFor="req-note" className={labelClass}>
                メモ(任意)
              </label>
              <input
                id="req-note"
                type="text"
                maxLength={255}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="例: 通院のため"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitMutation.isPending ? '提出中...' : '希望を提出'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              {isAdmin && <th className="px-4 py-3">職員</th>}
              <th className="px-4 py-3">日付</th>
              <th className="px-4 py-3">種類</th>
              <th className="px-4 py-3">メモ</th>
              <th className="px-4 py-3">状態</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {requests?.map((request) => (
              <tr key={request.id} className="border-b last:border-b-0">
                {isAdmin && <td className="px-4 py-3">{request.user_name}</td>}
                <td className="px-4 py-3">{request.work_date}</td>
                <td className="px-4 py-3">
                  {REQUEST_TYPE_LABELS[request.request_type]}
                  {request.shift_type_id !== null &&
                    `(${typeNameById.get(request.shift_type_id) ?? '?'})`}
                </td>
                <td className="max-w-48 truncate px-4 py-3 text-gray-500">{request.note}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={request.status} />
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: request.id, status: 'accepted' })
                          }
                          disabled={statusMutation.isPending}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          承認
                        </button>
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: request.id, status: 'rejected' })
                          }
                          disabled={statusMutation.isPending}
                          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                          却下
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {requests?.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            {isAdmin ? 'この月の希望はまだありません。' : '提出した希望はまだありません。'}
          </p>
        )}
      </div>
    </div>
  )
}
