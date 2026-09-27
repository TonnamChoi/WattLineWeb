import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { verifyToken } from "./handleAuthRequest.js";

const BUCKET = "pruning-photos";
// 업로드 직후 사진이 표(재분석 버튼 포함)와 상세보기에서 세션 내내 계속 쓰이므로,
// wattline-db 목록 조회(10분)보다 훨씬 긴 유효시간을 둔다.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

interface HandlerResult {
  status: number;
  body: any;
}

const MISSING_CREDS_MESSAGE =
  "파일 저장소(Supabase Storage)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

// 작업장 ID(uuid)만 폴더명으로 허용해 임의 경로 접근을 막는다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING_WORKPLACE_MESSAGE = "작업장을 먼저 선택하세요.";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function listPruningPhotos(workplaceId: unknown): Promise<HandlerResult> {
  if (typeof workplaceId !== "string" || !UUID_RE.test(workplaceId)) {
    return { status: 400, body: { error: MISSING_WORKPLACE_MESSAGE } };
  }
  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { data: files, error } = await supabase.storage.from(BUCKET).list(workplaceId, {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) throw error;

    const paths = (files || []).map((f) => `${workplaceId}/${f.name}`);
    if (paths.length === 0) {
      return { status: 200, body: { photos: [] } };
    }

    const { data: signedUrls, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    const urlByPath = new Map((signedUrls || []).map((s) => [s.path, s.signedUrl]));

    const photos = (files || [])
      .map((f) => ({
        url: urlByPath.get(`${workplaceId}/${f.name}`) || null,
        pathname: `${workplaceId}/${f.name}`,
        uploadedAt: f.created_at || new Date().toISOString(),
      }))
      .filter((p) => p.url);

    return { status: 200, body: { photos } };
  } catch (err: any) {
    console.error("Failed to list pruning photos", err);
    return { status: 500, body: { error: "사진 목록을 불러오지 못했습니다." } };
  }
}

export async function uploadPruningPhoto(reqBody: any): Promise<HandlerResult> {
  const { fileName, mimeType, dataUrl, workplaceId } = reqBody || {};
  if (!fileName || !mimeType || !dataUrl) {
    return { status: 400, body: { error: "파일 정보가 올바르지 않습니다." } };
  }
  if (typeof workplaceId !== "string" || !UUID_RE.test(workplaceId)) {
    return { status: 400, body: { error: MISSING_WORKPLACE_MESSAGE } };
  }

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const base64 = String(dataUrl).split(",").pop() || "";
    const buffer = Buffer.from(base64, "base64");
    const safeName = String(fileName).replace(/[^\w.\-가-힣]/g, "_");
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const pathname = `${workplaceId}/${Date.now()}-${randomSuffix}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(pathname, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw error;

    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pathname, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return {
      status: 200,
      body: { url: signedUrlData.signedUrl, pathname, uploadedAt: new Date().toISOString() },
    };
  } catch (err: any) {
    console.error("Failed to upload pruning photo", err);
    return { status: 500, body: { error: "사진 업로드에 실패했습니다." } };
  }
}

export async function deletePruningPhoto(reqBody: any): Promise<HandlerResult> {
  const { pathname } = reqBody || {};
  if (!pathname) {
    return { status: 400, body: { error: "삭제할 파일 정보가 없습니다." } };
  }

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { error } = await supabase.storage.from(BUCKET).remove([pathname]);
    if (error) throw error;
    return { status: 200, body: { success: true } };
  } catch (err: any) {
    console.error("Failed to delete pruning photo", err);
    return { status: 500, body: { error: "사진 삭제에 실패했습니다." } };
  }
}

// ---------------------------------------------------------------------------
// 웹 업로드 사진을 WattLineApp 사진(작업장 전지작업 표의 분류 칸)으로 옮긴다.
// pruning-photos 버킷의 파일을 photos 버킷({YYYYMMDD}/{uuid}.{ext})으로 복사하고,
// photo_uploads에 WattLineApp과 같은 형식의 행을 추가한 뒤 원본을 지운다.
// ---------------------------------------------------------------------------
const APP_BUCKET = "photos";
const APP_SIGNED_URL_TTL_SECONDS = 60 * 10;
const CATEGORIES = ["시작전주", "종료전주", "작업전", "흉고직경", "작업후", "기타"];

// 한국 시간 기준 오늘 날짜 (YYYYMMDD) — WattLineApp의 photo_date 형식
function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

export async function movePruningPhotoToCategory(reqBody: any, authHeader: unknown): Promise<HandlerResult> {
  const token = verifyToken(authHeader);
  if (!token || token.role === "worker") return { status: 401, body: { error: "로그인이 필요합니다." } };

  const { pathname, workplaceId, category } = reqBody || {};
  if (typeof workplaceId !== "string" || !UUID_RE.test(workplaceId)) {
    return { status: 400, body: { error: MISSING_WORKPLACE_MESSAGE } };
  }
  if (typeof pathname !== "string" || !pathname.startsWith(`${workplaceId}/`)) {
    return { status: 400, body: { error: "옮길 사진 정보가 올바르지 않습니다." } };
  }
  if (!CATEGORIES.includes(category)) {
    return { status: 400, body: { error: "알 수 없는 사진 분류입니다." } };
  }

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  let storagePath: string | null = null;
  try {
    const { data: workplace, error: wpError } = await supabase.from("workplaces").select("name").eq("id", workplaceId).single();
    if (wpError) throw wpError;

    const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(pathname);
    if (dlError) throw dlError;

    const ext = (pathname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const photoDate = todayKst();
    storagePath = `${photoDate}/${randomUUID()}.${ext}`;
    const { error: upError } = await supabase.storage
      .from(APP_BUCKET)
      .upload(storagePath, Buffer.from(await blob.arrayBuffer()), { contentType: blob.type || "image/jpeg", upsert: false });
    if (upError) throw upError;

    // 업로드 때 붙인 "{timestamp}-{rand}-" 접두어를 떼어 원래 파일명으로 남긴다.
    const fileName = (pathname.split("/").pop() || "").replace(/^\d+-[a-z0-9]+-/, "") || "photo.jpg";
    const { data: row, error: insError } = await supabase
      .from("photo_uploads")
      .insert({
        workplace_id: workplaceId,
        workplace_name: String(workplace.name).trim(),
        category,
        photo_date: photoDate,
        file_name: fileName,
        storage_path: storagePath,
      })
      .select("id")
      .single();
    if (insError) throw insError;

    // 원본 삭제는 실패해도 이동 자체는 성공으로 본다 (웹 업로드 목록에 남을 뿐).
    const { error: rmError } = await supabase.storage.from(BUCKET).remove([pathname]);
    if (rmError) console.error("Moved photo but failed to remove original", pathname, rmError);

    const { data: signed, error: signError } = await supabase.storage
      .from(APP_BUCKET)
      .createSignedUrl(storagePath, APP_SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return { status: 200, body: { id: row.id, url: signed.signedUrl, category } };
  } catch (err: any) {
    console.error("Failed to move pruning photo", err);
    // photos 버킷에 복사까지 됐는데 이후 단계에서 실패했다면 복사본을 지운다.
    if (storagePath) await supabase.storage.from(APP_BUCKET).remove([storagePath]).catch(() => {});
    return { status: 500, body: { error: "사진을 옮기지 못했습니다." } };
  }
}
