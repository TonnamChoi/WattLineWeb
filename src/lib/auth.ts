export interface AuthUser {
  id: string;
  loginId: string;
  name: string;
  role: "admin" | "company_admin" | "worker";
  companyName: string | null;
}

const TOKEN_KEY = "wattline.authToken";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 저장소 접근이 막힌 환경이면 무시
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(loginId: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password }),
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status}). 서버를 재시작했는지 확인하세요.`);
  if (!res.ok) throw new Error(data.error || `로그인 실패 (${res.status})`);
  setToken(data.token);
  return data.user;
}

// 저장된 토큰으로 로그인 상태를 복원한다. 토큰이 없거나 만료/무효면 null.
export async function restoreSession(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const res = await fetch("/api/auth", { headers: authHeaders() });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}
