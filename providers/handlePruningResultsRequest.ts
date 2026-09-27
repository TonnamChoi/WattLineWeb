import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyToken } from "./handleAuthRequest.js";

// 전지작업 분석 결과(작업장당 1행, pruning_results) 조회·저장.
// 관리자는 전체, 회사관리자는 소속 회사 작업장만 다룬다.

interface HandlerResult {
  status: number;
  body: any;
}

const MISSING_CREDS_MESSAGE =
  "DB(Supabase)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

const TEXT_FIELDS = [
  "pole_start",
  "pole_end",
  "tree_species",
  "note",
  "work_intensity",
  "tree_classification",
  "span_description",
  "work_content",
  "reasoning",
] as const;
const INT_FIELDS = ["dia_under10", "dia_over10", "dia_over20", "dia_over30", "dia_over40", "dia_total", "confidence"] as const;

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// 로그인 사용자가 이 작업장을 다룰 수 있는지 확인한다.
async function checkAccess(supabase: SupabaseClient, uid: string, workplaceId: string): Promise<HandlerResult | null> {
  const { data: me } = await supabase.from("app_users").select("role, is_active, company_id").eq("id", uid).maybeSingle();
  if (!me?.is_active || (me.role !== "admin" && me.role !== "company_admin")) {
    return { status: 403, body: { error: "권한이 없습니다." } };
  }
  const { data: wp } = await supabase.from("workplaces").select("company_id").eq("id", workplaceId).maybeSingle();
  if (!wp) return { status: 404, body: { error: "작업장을 찾을 수 없습니다." } };
  if (me.role === "company_admin" && wp.company_id !== me.company_id) {
    return { status: 403, body: { error: "소속 회사 작업장만 다룰 수 있습니다." } };
  }
  return null;
}

export async function handlePruningResultsRequest(
  method: string,
  workplaceIdParam: unknown,
  body: any,
  authHeader: unknown
): Promise<HandlerResult> {
  const token = verifyToken(authHeader);
  if (!token) return { status: 401, body: { error: "로그인이 필요합니다." } };

  const workplaceId = method === "GET" ? workplaceIdParam : body?.workplace_id;
  if (typeof workplaceId !== "string" || !workplaceId) {
    return { status: 400, body: { error: "작업장을 먼저 선택하세요." } };
  }

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const denied = await checkAccess(supabase, token.uid, workplaceId);
    if (denied) return denied;

    if (method === "GET") {
      const { data, error } = await supabase.from("pruning_results").select("*").eq("workplace_id", workplaceId).maybeSingle();
      if (error) throw error;
      return { status: 200, body: { result: data } };
    }

    if (method === "PUT") {
      const row: Record<string, unknown> = { workplace_id: workplaceId, updated_by: token.uid, updated_at: new Date().toISOString() };
      for (const f of TEXT_FIELDS) {
        const v = body?.[f];
        row[f] = typeof v === "string" && v.trim() !== "" ? v : null;
      }
      for (const f of INT_FIELDS) {
        const v = Number(body?.[f]);
        row[f] = Number.isFinite(v) ? Math.round(v) : f === "confidence" ? null : 0;
      }
      row.photo_analysis = body?.photo_analysis && typeof body.photo_analysis === "object" ? body.photo_analysis : {};
      // 분류 칸별 사진 순서 { 분류: [photo_uploads.id, ...] } — 문자열 배열만 받는다
      const order: Record<string, string[]> = {};
      if (body?.photo_order && typeof body.photo_order === "object") {
        for (const [k, v] of Object.entries(body.photo_order)) {
          if (Array.isArray(v)) order[k] = v.filter((x): x is string => typeof x === "string");
        }
      }
      row.photo_order = order;

      const { data, error } = await supabase
        .from("pruning_results")
        .upsert(row, { onConflict: "workplace_id" })
        .select("updated_at")
        .single();
      if (error) throw error;
      return { status: 200, body: { success: true, updated_at: data.updated_at } };
    }

    return { status: 405, body: { error: "허용되지 않은 요청 방식입니다." } };
  } catch (err) {
    console.error(`Pruning results ${method} failed`, err);
    return { status: 500, body: { error: "전지작업 결과를 처리하지 못했습니다." } };
  }
}
