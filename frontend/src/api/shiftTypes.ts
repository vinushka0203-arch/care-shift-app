import { apiFetch } from './client'
import type { ShiftType, ShiftTypeInput } from '../types/shiftType'

/** 勤務区分の一覧を並び順で取得する(認証済みなら誰でも)。 */
export function listShiftTypes(): Promise<ShiftType[]> {
  return apiFetch<ShiftType[]>('/api/shift-types')
}

/** 勤務区分を新規作成する(管理者のみ)。 */
export function createShiftType(input: ShiftTypeInput): Promise<ShiftType> {
  return apiFetch<ShiftType>('/api/shift-types', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 勤務区分を部分更新する(管理者のみ)。 */
export function updateShiftType(id: number, input: Partial<ShiftTypeInput>): Promise<ShiftType> {
  return apiFetch<ShiftType>(`/api/shift-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
