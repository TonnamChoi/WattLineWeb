// 클라이언트가 보낸 이미지(dataURL/base64 또는 저장소 signed URL)를 AI 프로바이더가 받는 base64로 바꾼다.
// 저장된 사진은 클라이언트가 signed URL만 갖고 있으므로 서버가 대신 내려받는다.
// 임의 주소를 대신 받아오지 않도록 우리 Supabase Storage의 signed URL만 허용한다.

export class ImageLoadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function loadImageAsBase64(
  image: string,
  mimeType: string | undefined
): Promise<{ base64Data: string; mimeType: string }> {
  if (!/^https?:\/\//i.test(image)) {
    return { base64Data: image.replace(/^data:image\/\w+;base64,/, ""), mimeType: mimeType || "image/jpeg" };
  }

  const supabaseOrigin = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  const url = new URL(image);
  if (!supabaseOrigin || url.origin !== supabaseOrigin || !url.pathname.startsWith("/storage/v1/object/sign/")) {
    throw new ImageLoadError("허용되지 않은 이미지 주소입니다.", 400);
  }

  const res = await fetch(url);
  if (!res.ok) {
    // signed URL 유효시간(10분~6시간)이 지나면 400/403이 온다.
    throw new ImageLoadError("사진 링크가 만료되었습니다. 화면을 새로고침한 뒤 다시 분석하세요.", 410);
  }
  const contentType = res.headers.get("content-type") || "";
  return {
    base64Data: Buffer.from(await res.arrayBuffer()).toString("base64"),
    mimeType: contentType.startsWith("image/") ? contentType.split(";")[0] : mimeType || "image/jpeg",
  };
}
