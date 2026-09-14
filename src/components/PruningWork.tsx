import React, { useEffect, useRef, useState } from "react";
import { Upload, Trash2, AlertCircle, Loader2, ImageOff } from "lucide-react";
import { resizeImageFile } from "../lib/resizeImage";

interface PruningPhoto {
  url: string;
  pathname: string;
  uploadedAt: string;
}

export default function PruningWork() {
  const [photos, setPhotos] = useState<PruningPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/pruning");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "사진 목록을 불러오지 못했습니다.");
      setPhotos(data.photos || []);
    } catch (err: any) {
      setErrorMsg(err.message || "사진 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const uploadFiles = async (files: FileList) => {
    setErrorMsg(null);
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setErrorMsg("올바른 이미지 파일을 업로드해 주세요. (PNG, JPG, JPEG 등)");
      return;
    }

    setIsUploading(true);
    for (const file of imageFiles) {
      try {
        const { url: dataUrl, mimeType } = await resizeImageFile(file);
        const res = await fetch("/api/pruning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType, dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "사진 업로드에 실패했습니다.");
        setPhotos((prev) => [{ url: data.url, pathname: data.pathname, uploadedAt: data.uploadedAt }, ...prev]);
      } catch (err: any) {
        setErrorMsg(err.message || "사진 업로드에 실패했습니다.");
      }
    }
    setIsUploading(false);
  };

  const handleDelete = async (photo: PruningPhoto) => {
    setDeletingUrl(photo.url);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/pruning", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: photo.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "사진 삭제에 실패했습니다.");
      setPhotos((prev) => prev.filter((p) => p.url !== photo.url));
    } catch (err: any) {
      setErrorMsg(err.message || "사진 삭제에 실패했습니다.");
    } finally {
      setDeletingUrl(null);
    }
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
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="mb-3">
          <h2 className="font-bold text-gray-800 text-sm">전지작업 사진 첨부</h2>
          <p className="text-xs text-gray-400 mt-0.5">전지작업 관련 사진을 선택하거나 드롭 하세요</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-blue-500 bg-blue-50/50"
              : "border-gray-300 hover:border-blue-400 bg-gray-50/60 hover:bg-white"
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-2" />
              <p className="text-gray-800 font-bold text-xs md:text-sm">업로드 중...</p>
            </>
          ) : (
            <>
              <div className="p-2.5 bg-white rounded border border-gray-200 shadow-xs mb-2 text-blue-600">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-gray-800 font-bold text-xs md:text-sm mb-0.5">
                여기에 전지작업 사진을 드래그하여 드롭하거나 클릭하여 업로드
              </p>
              <p className="text-gray-400 text-[11px]">
                여러 장의 사진을 동시에 업로드할 수 있습니다. (PNG, JPG, JPEG 지원)
              </p>
            </>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm">첨부된 사진 ({photos.length})</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            불러오는 중...
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <ImageOff className="w-6 h-6" />
            첨부된 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.url} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={photo.url} alt={photo.pathname} className="w-full h-32 object-cover" />
                <button
                  onClick={() => handleDelete(photo)}
                  disabled={deletingUrl === photo.url}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  title="삭제"
                >
                  {deletingUrl === photo.url ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
