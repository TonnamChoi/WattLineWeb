import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { PoleImage } from "../types";
import { resizeImageFile } from "../lib/resizeImage";

interface DropZoneProps {
  onImagesAdded: (images: PoleImage[]) => void;
  uploadedCount: number;
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
