import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { PoleImage } from "../types";

interface DropZoneProps {
  onImagesAdded: (images: PoleImage[]) => void;
  uploadedCount: number;
}

// Vercel Serverless Function의 요청 본문 제한(4.5MB)을 넘지 않도록,
// 업로드 전에 이미지를 리사이즈하고 JPEG로 재압축한다.
// Claude/Gemini/OpenAI 비전 API는 내부적으로 긴 변 기준 약 1500~1600px로 처리하므로,
// 그 이상 고해상도로 보내도 문자 인식률에는 도움이 되지 않고 용량만 커진다.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.9;

function resizeImageFile(file: File): Promise<{ url: string; mimeType: string }> {
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

export default function DropZone({ onImagesAdded, uploadedCount }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList) => {
    setErrorMsg(null);
    const validImages: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        validImages.push(file);
      }
    }

    if (validImages.length === 0) {
      setErrorMsg("올바른 이미지 파일을 업로드해 주세요. (PNG, JPG, JPEG 등)");
      return;
    }

    const newPoleImages: PoleImage[] = [];
    let loadedCount = 0;

    validImages.forEach((file) => {
      resizeImageFile(file)
        .then(({ url, mimeType }) => {
          newPoleImages.push({
            id: `pole-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url,
            mimeType,
            status: "idle",
            error: null,
            lineName: null,
            computerizedNumber: null,
            lineNumber: null,
            confidence: null,
            extraInfo: null,
            reasoning: null,
            boundingBox: null,
            isSample: false,
            uploadedAt: new Date().toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          });
        })
        .catch((err) => {
          console.error("Image resize failed for file", file.name, err);
        })
        .finally(() => {
          loadedCount++;
          if (loadedCount === validImages.length) {
            onImagesAdded(newPoleImages);
          }
        });
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleFileChange}
      />

      {uploadedCount > 0 ? (
        <div
          id="dropzone-container"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-lg p-3 flex items-center gap-3 transition-all duration-200 ${
            isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-300 bg-gray-50/60"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-gray-800 font-bold text-xs">
              {uploadedCount}개의 이미지가 업로드 되었습니다.
            </p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              드래그 앤 드롭으로도 다른 이미지를 추가할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onButtonClick}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            이미지 업로드
          </button>
        </div>
      ) : (
        <div
          id="dropzone-container"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-blue-500 bg-blue-50/50"
              : "border-gray-300 hover:border-blue-400 bg-gray-50/60 hover:bg-white"
          }`}
        >
          <div className="p-2.5 bg-white rounded border border-gray-200 shadow-xs mb-2 text-blue-600">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-gray-800 font-bold text-xs md:text-sm mb-0.5">
            여기에 전주번호찰 이미지들을 드래그하여 드롭하거나 클릭하여 업로드
          </p>
          <p className="text-gray-400 text-[11px]">
            여러 장의 이미지를 동시에 업로드할 수 있습니다. (PNG, JPG, JPEG 지원)
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
