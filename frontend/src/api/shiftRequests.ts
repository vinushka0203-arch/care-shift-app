import { apiFetch } from './client'
import type { RequestStatus, ShiftRequest, ShiftRequestInput } from '../types/shiftRequest'

/** 希望の一覧を取得する(職員は自分の分、管理者は全員分)。year/month は任意。 */
export function listShiftRequests(year?: number, month?: number): Promise<ShiftRequest[]> {
  const query = year !== undefined && month !== undefined ? `?year=${year}&month=${month}` : ''
  return apiFetch<ShiftRequest[]>(`/api/shift-requests${query}`)
}

/** 希望を提出する。 */
export function createShiftRequest(input: ShiftRequestInput): Promise<ShiftRequest> {
  return apiFetch<ShiftRequest>('/api/shift-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 希望を承認/却下する(管理者のみ)。 */
export function updateShiftRequestStatus(
  id: number,
  status: Exclude<RequestStatus, 'pending'>,
): Promise<ShiftRequest> {
  return apiFetch<ShiftRequest>(`/api/shift-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
