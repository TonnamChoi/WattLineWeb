import { BoundingBox } from "../types";

// AI가 감지한 bounding box 영역만큼 이미지를 잘라내 번호판 부분만 담은 데이터 URL을 반환한다.
export function cropToBoundingBox(url: string, box: BoundingBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Pad the detected box slightly so the crop isn't flush against the plate's edge
      const padX = box.width * 0.06;
      const padY = box.height * 0.06;
      const x = Math.max(0, box.x - padX / 2);
      const y = Math.max(0, box.y - padY / 2);
      const width = Math.min(box.width + padX, 1 - x);
      const height = Math.min(box.height + padY, 1 - y);

      const sx = x * naturalWidth;
      const sy = y * naturalHeight;
      const sw = width * naturalWidth;
      const sh = height * naturalHeight;
      if (sw <= 0 || sh <= 0) {
        reject(new Error("잘라낼 영역이 없습니다."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("캔버스를 생성할 수 없습니다."));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    img.src = url;
  });
}
