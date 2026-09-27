import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "./handleAuthRequest.js";

interface HandlerResult {
  status: number;
  body: any;
}

const MISSING_CREDS_MESSAGE =
  "WattLine 연동 DB(Supabase)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function listWattlineDbPhotos(workplaceId: unknown): Promise<HandlerResult> {
  if (typeof workplaceId !== "string" || !workplaceId) {
    return { status: 400, body: { error: "작업장을 먼저 선택하세요." } };
  }

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };
  }

  try {
    const supabase = createClient(url, secretKey);

    const { data: rows, error } = await supabase
      .from("photo_uploads")
      .select("*")
      .eq("workplace_id", workplaceId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return { status: 200, body: { photos: [] } };
    }

    const paths = rows.map((r) => r.storage_path as string);
    const { data: signedUrls, error: signError } = await supabase.storage
      .from("photos")
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (signError) throw signError;

    const urlByPath = new Map((signedUrls || []).map((s) => [s.path, s.signedUrl]));

    const photos = rows
      .map((r) => ({
        id: r.id as string,
        url: urlByPath.get(r.storage_path as string) || null,
        fileName: r.file_name as string,
        workplaceName: r.workplace_name as string,
        category: r.category as string,
        photoDate: r.photo_date as string,
        createdAt: r.created_at as string,
      }))
      .filter((p) => p.url);

    return { status: 200, body: { photos } };
  } catch (err: any) {
    console.error("Failed to list WattLine DB photos", err);
    return { status: 500, body: { error: "WattLine DB 사진 목록을 불러오지 못했습니다." } };
  }
}

// 전지작업 표의 분류 칸에 있는 사진(photo_uploads 행 + photos 버킷 파일)을 삭제한다.
// 관리자는 전체, 회사관리자는 소속 회사 작업장의 사진만 지울 수 있다.
export async function deleteWattlineDbPhoto(reqBody: any, authHeader: unknown): Promise<HandlerResult> {
  const token = verifyToken(authHeader);
  if (!token) return { status: 401, body: { error: "로그인이 필요합니다." } };

  const id = reqBody?.id;
  if (typeof id !== "string" || !id) return { status: 400, body: { error: "삭제할 사진 정보가 없습니다." } };

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const supabase = createClient(url, secretKey);

    const { data: me } = await supabase.from("app_users").select("role, is_active, company_id").eq("id", token.uid).maybeSingle();
    if (!me?.is_active || (me.role !== "admin" && me.role !== "company_admin")) {
      return { status: 403, body: { error: "사진을 삭제할 권한이 없습니다." } };
    }

    const { data: row, error: rowError } = await supabase
      .from("photo_uploads")
      .select("storage_path, workplace:workplaces(company_id)")
      .eq("id", id)
      .maybeSingle();
    if (rowError) throw rowError;
    if (!row) return { status: 404, body: { error: "이미 삭제된 사진입니다." } };

    if (me.role === "company_admin" && (row.workplace as any)?.company_id !== me.company_id) {
      return { status: 403, body: { error: "소속 회사 작업장의 사진만 삭제할 수 있습니다." } };
    }

    // 행을 먼저 지워 화면에서 사라지게 하고, 파일 삭제 실패는 기록만 남긴다(고아 파일은 표에 나오지 않는다).
    const { error: delError } = await supabase.from("photo_uploads").delete().eq("id", id);
    if (delError) throw delError;
    const { error: rmError } = await supabase.storage.from("photos").remove([row.storage_path as string]);
    if (rmError) console.error("Deleted row but failed to remove file", row.storage_path, rmError);

    return { status: 200, body: { success: true } };
  } catch (err: any) {
    console.error("Failed to delete WattLine DB photo", err);
    return { status: 500, body: { error: "사진을 삭제하지 못했습니다." } };
  }
}
