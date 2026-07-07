/** バックエンドの ShiftTypeRead スキーマに対応する型。 */
export interface ShiftType {
  id: number
  name: string
  short_label: string
  /** "HH:MM:SS" 形式。休みの区分は null */
  start_time: string | null
  end_time: string | null
  color: string
  is_work: boolean
  sort_order: number
}

/** 勤務区分の作成・更新リクエストボディ。 */
export interface ShiftTypeInput {
  name: string
  short_label: string
  start_time: string | null
  end_time: string | null
  color: string
  is_work: boolean
  sort_order: number
}
