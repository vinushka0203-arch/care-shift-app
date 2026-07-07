/** バックエンドの UserRead スキーマに対応する型。 */
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff'
  employment_type: 'full_time' | 'part_time'
  is_active: boolean
  created_at: string
}
