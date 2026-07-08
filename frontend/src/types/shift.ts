/** バックエンドの ShiftRead スキーマに対応する型。 */
export interface Shift {
  id: number
  user_id: number
  /** "YYYY-MM-DD" 形式 */
  work_date: string
  shift_type_id: number
  note: string | null
}

/** シフト表の行を描画するための最小限の職員情報。 */
export interface StaffSummary {
  id: number
  name: string
}

/** GET /api/shifts のレスポンス。 */
export interface MonthlyShifts {
  users: StaffSummary[]
  shifts: Shift[]
}

/** 一括保存の1項目。shift_type_id が null のセルは削除(空に戻す)。 */
export interface ShiftBulkItem {
  user_id: number
  work_date: string
  shift_type_id: number | null
}

/** PUT /api/shifts/bulk のレスポンス。 */
export interface ShiftBulkResult {
  saved: number
  deleted: number
}
