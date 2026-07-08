/** API 通信の共通設定と fetch ラッパー。 */
// 本番(Vercel)では VITE_API_BASE_URL に Render の URL を設定する。未設定ならローカル開発用
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** API 呼び出し時のエラー(ステータスコード付き)。 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * 認証トークンを自動付与する fetch ラッパー。
 * レスポンスが成功しなければ ApiError を投げる。
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let detail = 'リクエストに失敗しました'
    try {
      const body = await response.json()
      detail = body.detail ?? detail
    } catch {
      // レスポンスボディが JSON でない場合はデフォルトメッセージを使う
    }
    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}
