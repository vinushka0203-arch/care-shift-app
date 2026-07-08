import { apiFetch } from './client'
import type { MonthlyShifts, ShiftBulkItem, ShiftBulkResult } from '../types/shift'

/** 指定月のシフトと職員一覧を取得する(認証済みなら誰でも)。 */
export function getMonthlyShifts(year: number, month: number): Promise<MonthlyShifts> {
  return apiFetch<MonthlyShifts>(`/api/shifts?year=${year}&month=${month}`)
}

/** シフトを一括保存する(管理者のみ)。 */
export function saveShifts(items: ShiftBulkItem[]): Promise<ShiftBulkResult> {
  return apiFetch<ShiftBulkResult>('/api/shifts/bulk', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}
