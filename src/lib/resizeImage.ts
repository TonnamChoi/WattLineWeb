// Vercel Serverless Function의 요청 본문 제한(4.5MB)을 넘지 않도록,
// 업로드 전에 이미지를 리사이즈하고 JPEG로 재압축한다.
// Claude/Gemini/OpenAI 비전 API는 내부적으로 긴 변 기준 약 1500~1600px로 처리하므로,
// 그 이상 고해상도로 보내도 문자 인식률에는 도움이 되지 않고 용량만 커진다.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.9;

export function resizeImageFile(file: File): Promise<{ url: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);

      if (!ctx) {
        reject(new Error("이미지를 처리할 수 없습니다."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve({ url: canvas.toDataURL("image/jpeg", JPEG_QUALITY), mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = objectUrl;
  });
}
