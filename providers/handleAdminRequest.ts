import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "crypto";
import { verifyToken } from "./handleAuthRequest.js";

interface HandlerResult {
  status: number;
  body: any;
}

type Entity = "companies" | "users" | "workplaces";

const MISSING_CREDS_MESSAGE =
  "관리자 DB(Supabase)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

// 클라이언트가 보낼 수 있는 컬럼만 허용한다 (id, 해시, 생성일 등은 서버가 관리).
const WRITABLE_FIELDS: Record<Entity, string[]> = {
  companies: ["name", "business_no", "ceo_name", "address", "phone", "memo"],
  users: ["login_id", "name", "company_id", "phone", "role", "is_active"],
  workplaces: ["company_id", "name", "description", "start_date", "end_date", "is_completed", "memo"],
};

const TABLE: Record<Entity, string> = {
  companies: "companies",
  users: "app_users",
  workplaces: "workplaces",
};

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function pickFields(entity: Entity, body: any) {
  const row: Record<string, any> = {};
  for (const f of WRITABLE_FIELDS[entity]) {
    if (body?.[f] === undefined) continue;
    // 빈 문자열은 NULL로 저장해 날짜/FK 컬럼 오류를 막는다.
    row[f] = body[f] === "" ? null : body[f];
  }
  return row;
}

function toMessage(err: any): string {
  if (err?.code === "23505") return "이미 등록된 값입니다 (중복: 회사명 또는 사용자 아이디).";
  if (err?.code === "23503") return "다른 데이터에서 사용 중이라 삭제할 수 없습니다. 연결된 사용자/작업장을 먼저 정리하세요.";
  if (err?.code === "23502") return "필수 항목이 비어 있습니다.";
  return "처리 중 오류가 발생했습니다.";
}

async function list(supabase: SupabaseClient, entity: Entity) {
  if (entity === "companies") {
    return supabase.from("companies").select("*").order("name");
  }
  if (entity === "users") {
    // password_hash는 절대 내려보내지 않는다.
    return supabase
      .from("app_users")
      .select("id, login_id, name, company_id, phone, role, is_active, created_at, updated_at, company:companies(name)")
      .order("name");
  }
  return supabase
    .from("workplaces")
    .select("*, company:companies(name), workers:workplace_workers(user_id)")
    .order("start_date", { ascending: false, nullsFirst: false });
}

async function syncWorkers(supabase: SupabaseClient, workplaceId: string, workerIds: unknown) {
  if (!Array.isArray(workerIds)) return;
  const { error: delError } = await supabase.from("workplace_workers").delete().eq("workplace_id", workplaceId);
  if (delError) throw delError;
  if (workerIds.length === 0) return;
  const { error } = await supabase
    .from("workplace_workers")
    .insert(workerIds.map((userId) => ({ workplace_id: workplaceId, user_id: userId })));
  if (error) throw error;
}

export async function handleAdminRequest(
  method: string,
  entityParam: unknown,
  body: any,
  authHeader: unknown
): Promise<HandlerResult> {
  const token = verifyToken(authHeader);
  if (!token) return { status: 401, body: { error: "로그인이 필요합니다." } };

  const entity = entityParam as Entity;
  if (!TABLE[entity]) return { status: 400, body: { error: "알 수 없는 관리 항목입니다." } };

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  // 토큰 발급 후 역할이 바뀌거나 계정이 중지됐을 수 있으므로 DB 기준으로 다시 확인한다.
  const { data: me } = await supabase.from("app_users").select("role, is_active").eq("id", token.uid).maybeSingle();
  if (!me || !me.is_active || me.role !== "admin") {
    return { status: 403, body: { error: "관리자만 사용할 수 있습니다." } };
  }

  const table = TABLE[entity];

  try {
    if (method === "GET") {
      const { data, error } = await list(supabase, entity);
      if (error) throw error;
      return { status: 200, body: { items: data || [] } };
    }

    if (method === "POST" || method === "PUT") {
      const row = pickFields(entity, body);

      if (entity === "users") {
        const password = typeof body?.password === "string" ? body.password : "";
        if (method === "POST" && !password) {
          return { status: 400, body: { error: "비밀번호를 입력하세요." } };
        }
        // 수정 시 비밀번호가 비어 있으면 기존 비밀번호를 유지한다.
        if (password) row.password_hash = hashPassword(password);
      }

      let id: string;
      if (method === "POST") {
        const { data, error } = await supabase.from(table).insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      } else {
        if (!body?.id) return { status: 400, body: { error: "수정할 항목의 id가 없습니다." } };
        id = body.id;
        const { error } = await supabase
          .from(table)
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }

      if (entity === "workplaces") await syncWorkers(supabase, id, body?.worker_ids);

      return { status: 200, body: { id } };
    }

    if (method === "DELETE") {
      if (!body?.id) return { status: 400, body: { error: "삭제할 항목의 id가 없습니다." } };
      const { error } = await supabase.from(table).delete().eq("id", body.id);
      if (error) throw error;
      return { status: 200, body: { ok: true } };
    }

    return { status: 405, body: { error: "허용되지 않은 요청 방식입니다." } };
  } catch (err: any) {
    console.error(`Admin ${method} ${entity} failed`, err);
    return { status: 400, body: { error: toMessage(err) } };
  }
}

// 작업장 목록(읽기 전용) — 로그인한 모든 사용자용.
// 작업자는 요청값과 상관없이 자기 소속 회사로 고정하고, 관리자만 companyId로 회사를 고를 수 있다(비우면 전체).
export async function listWorkplacesForUser(authHeader: unknown, companyIdParam: unknown): Promise<HandlerResult> {
  const token = verifyToken(authHeader);
  if (!token) return { status: 401, body: { error: "로그인이 필요합니다." } };

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { data: me, error: meError } = await supabase
      .from("app_users")
      .select("role, is_active, company_id")
      .eq("id", token.uid)
      .maybeSingle();
    if (meError) throw meError;
    if (!me || !me.is_active) return { status: 401, body: { error: "로그인이 필요합니다." } };

    let companyId: string | null;
    if (me.role === "admin") {
      companyId = typeof companyIdParam === "string" && companyIdParam ? companyIdParam : null;
    } else {
      if (!me.company_id) return { status: 200, body: { items: [] } };
      companyId = me.company_id;
    }

    let query = supabase
      .from("workplaces")
      .select("id, name, description, start_date, end_date, is_completed, memo, company:companies(name), workers:workplace_workers(user:app_users(name))")
      .order("is_completed")
      .order("start_date", { ascending: false, nullsFirst: false });
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error } = await query;
    if (error) throw error;
    return { status: 200, body: { items: data || [] } };
  } catch (err) {
    console.error("List workplaces failed", err);
    return { status: 500, body: { error: "작업장 목록을 불러오지 못했습니다." } };
  }
}
