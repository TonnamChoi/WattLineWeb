import { createClient } from "@supabase/supabase-js";

interface HandlerResult {
  status: number;
  body: any;
}

const MISSING_CREDS_MESSAGE =
  "WattLine 연동 DB(Supabase)가 연결되어 있지 않습니다. SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수를 설정하세요.";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function listWattlineDbPhotos(): Promise<HandlerResult> {
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
