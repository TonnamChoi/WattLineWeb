import { createClient } from "@supabase/supabase-js";

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

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function listPruningPhotos(): Promise<HandlerResult> {
  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const { data: files, error } = await supabase.storage.from(BUCKET).list("", {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) throw error;

    const paths = (files || []).map((f) => f.name);
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
        url: urlByPath.get(f.name) || null,
        pathname: f.name,
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
  const { fileName, mimeType, dataUrl } = reqBody || {};
  if (!fileName || !mimeType || !dataUrl) {
    return { status: 400, body: { error: "파일 정보가 올바르지 않습니다." } };
  }

  const supabase = getClient();
  if (!supabase) return { status: 500, body: { error: MISSING_CREDS_MESSAGE } };

  try {
    const base64 = String(dataUrl).split(",").pop() || "";
    const buffer = Buffer.from(base64, "base64");
    const safeName = String(fileName).replace(/[^\w.\-가-힣]/g, "_");
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const pathname = `${Date.now()}-${randomSuffix}-${safeName}`;

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
