/** 希望の種類。day_off = 休み希望、work_preference = 勤務希望 */
export type RequestType = 'day_off' | 'work_preference'

/** 希望の状態。pending = 審査中 */
export type RequestStatus = 'pending' | 'accepted' | 'rejected'

/** バックエンドの ShiftRequestRead スキーマに対応する型。 */
export interface ShiftRequest {
  id: number
  user_id: number
  user_name: string
  /** "YYYY-MM-DD" 形式 */
  work_date: string
  shift_type_id: number | null
  request_type: RequestType
  status: RequestStatus
  note: string | null
  created_at: string
}

/** 希望の提出リクエストボディ。 */
export interface ShiftRequestInput {
  work_date: string
  request_type: RequestType
  shift_type_id: number | null
  note?: string
}
