import { list, put, del } from "@vercel/blob";

const PRUNING_PREFIX = "pruning/";

interface HandlerResult {
  status: number;
  body: any;
}

function isMissingTokenError(err: any): boolean {
  const message = err?.message || "";
  return message.includes("BLOB_READ_WRITE_TOKEN");
}

const MISSING_TOKEN_MESSAGE =
  "파일 저장소(Vercel Blob)가 연결되어 있지 않습니다. Vercel 프로젝트에 Blob 스토어를 연결한 뒤 `vercel env pull`로 BLOB_READ_WRITE_TOKEN 환경변수를 받아오세요.";

export async function listPruningPhotos(): Promise<HandlerResult> {
  try {
    const { blobs } = await list({ prefix: PRUNING_PREFIX });
    const photos = blobs
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        uploadedAt: b.uploadedAt,
      }));
    return { status: 200, body: { photos } };
  } catch (err: any) {
    if (isMissingTokenError(err)) {
      return { status: 500, body: { error: MISSING_TOKEN_MESSAGE } };
    }
    console.error("Failed to list pruning photos", err);
    return { status: 500, body: { error: "사진 목록을 불러오지 못했습니다." } };
  }
}

export async function uploadPruningPhoto(reqBody: any): Promise<HandlerResult> {
  const { fileName, mimeType, dataUrl } = reqBody || {};
  if (!fileName || !mimeType || !dataUrl) {
    return { status: 400, body: { error: "파일 정보가 올바르지 않습니다." } };
  }

  try {
    const base64 = String(dataUrl).split(",").pop() || "";
    const buffer = Buffer.from(base64, "base64");
    const safeName = String(fileName).replace(/[^\w.\-가-힣]/g, "_");
    const pathname = `${PRUNING_PREFIX}${Date.now()}-${safeName}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
    });

    return {
      status: 200,
      body: { url: blob.url, pathname: blob.pathname, uploadedAt: new Date().toISOString() },
    };
  } catch (err: any) {
    if (isMissingTokenError(err)) {
      return { status: 500, body: { error: MISSING_TOKEN_MESSAGE } };
    }
    console.error("Failed to upload pruning photo", err);
    return { status: 500, body: { error: "사진 업로드에 실패했습니다." } };
  }
}

export async function deletePruningPhoto(reqBody: any): Promise<HandlerResult> {
  const { url } = reqBody || {};
  if (!url) {
    return { status: 400, body: { error: "삭제할 파일 정보가 없습니다." } };
  }

  try {
    await del(url);
    return { status: 200, body: { success: true } };
  } catch (err: any) {
    if (isMissingTokenError(err)) {
      return { status: 500, body: { error: MISSING_TOKEN_MESSAGE } };
    }
    console.error("Failed to delete pruning photo", err);
    return { status: 500, body: { error: "사진 삭제에 실패했습니다." } };
  }
}
