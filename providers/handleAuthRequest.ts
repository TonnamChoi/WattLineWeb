import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, scryptSync, timingSafeEqual } from "crypto";

interface HandlerResult {
  status: number;
  body: any;
}

export interface TokenPayload {
  uid: string;
  role: "admin" | "company_admin" | "worker";
  exp: number;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const WORKER_WEB_MESSAGE = "일반사용자는 웹을 사용할 수 없습니다. WattLineApp에서 사진을 업로드하세요.";

const MISSING_CREDS_MESSAGE =
  "로그인 DB(Supabase)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// 별도 환경변수 없이 SUPABASE_SECRET_KEY에서 토큰 서명 키를 파생한다.
// (Supabase 키를 교체하면 기존 로그인 토큰은 모두 무효가 된다)
function signingKey() {
  return createHash("sha256").update(`wattline-auth:${process.env.SUPABASE_SECRET_KEY || ""}`).digest();
}

function sign(data: string) {
  return createHmac("sha256", signingKey()).update(data).digest("base64url");
}

function issueToken(uid: string, role: TokenPayload["role"]) {
  const payload: TokenPayload = { uid, role, exp: Date.now() + TOKEN_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyToken(authHeader: unknown): TokenPayload | null {
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) return null;
  const [data, sig] = authHeader.slice(7).split(".");
  if (!data || !sig || !process.env.SUPABASE_SECRET_KEY) return null;

  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

// handleAdminRequest.hashPassword가 만드는 `scrypt$<salt>$<hash>` 형식을 검증한다.
function verifyPassword(stored: string, password: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function toUser(row: any) {
  return {
    id: row.id as string,
    loginId: row.login_id as string,
    name: row.name as string,
    role: row.role as TokenPayload["role"],
    companyName: (row.company?.name as string) || null,
  };
}

const USER_COLUMNS = "id, login_id, name, role, is_active, password_hash, company:companies(name)";

export async function login(body: any): Promise<HandlerResult> {
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!loginId || !password) return { status: 400, body: { error: "아이디와 비밀번호를 입력하세요." } };

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { data: row, error } = await supabase.from("app_users").select(USER_COLUMNS).eq("login_id", loginId).maybeSingle();
    if (error) throw error;

    // 아이디 존재 여부를 노출하지 않도록 같은 메시지를 쓴다.
    if (!row || !verifyPassword(row.password_hash, password)) {
      return { status: 401, body: { error: "아이디 또는 비밀번호가 올바르지 않습니다." } };
    }
    if (!row.is_active) return { status: 403, body: { error: "사용이 중지된 계정입니다. 관리자에게 문의하세요." } };
    // 일반사용자(worker)는 WattLineApp(사진 업로드) 전용이라 웹 로그인을 막는다.
    if (row.role === "worker") return { status: 403, body: { error: WORKER_WEB_MESSAGE } };

    return { status: 200, body: { token: issueToken(row.id, row.role), user: toUser(row) } };
  } catch (err) {
    console.error("Login failed", err);
    return { status: 500, body: { error: "로그인 처리 중 오류가 발생했습니다." } };
  }
}

// 저장된 토큰으로 새로고침 시 로그인 상태를 복원한다. 매번 DB를 다시 읽어 중지/역할 변경을 반영한다.
export async function getMe(authHeader: unknown): Promise<HandlerResult> {
  const payload = verifyToken(authHeader);
  if (!payload) return { status: 401, body: { error: "로그인이 필요합니다." } };

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { data: row, error } = await supabase.from("app_users").select(USER_COLUMNS).eq("id", payload.uid).maybeSingle();
    if (error) throw error;
    if (!row || !row.is_active || row.role === "worker") return { status: 401, body: { error: "로그인이 필요합니다." } };
    return { status: 200, body: { user: toUser(row) } };
  } catch (err) {
    console.error("Session check failed", err);
    return { status: 500, body: { error: "로그인 상태를 확인하지 못했습니다." } };
  }
}
