import React, { useState } from "react";
import { PoleImage } from "../types";
import { cropToBoundingBox } from "../lib/cropImage";
import { Search, Download, Clipboard, Trash2, CheckCircle2, Play, Loader2, Eye } from "lucide-react";

interface PoleTableProps {
  poles: PoleImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAnalyze: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

export default function PoleTable({
  poles,
  selectedId,
  onSelect,
  onRemove,
  onClearAll,
  onAnalyze,
  onOpenDetail,
}: PoleTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // 상세보기 버튼에 마우스를 올리면 크롭된 번호판 이미지를 작은 미리보기로 보여준다.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const [cropCache, setCropCache] = useState<Record<string, string>>({});

  const handlePreviewEnter = (pole: PoleImage, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ top: rect.top, left: rect.left + rect.width / 2 });
    setHoveredId(pole.id);

    if (!cropCache[pole.id] && pole.boundingBox) {
      cropToBoundingBox(pole.url, pole.boundingBox)
        .then((url) => setCropCache((prev) => ({ ...prev, [pole.id]: url })))
        .catch(() => {});
    }
  };

  const handlePreviewLeave = () => {
    setHoveredId(null);
  };

  const hoveredPole = hoveredId ? poles.find((p) => p.id === hoveredId) : null;

  // 실패 배지를 클릭하면 실패 사유를 클립보드로 복사
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);

  const handleCopyError = (pole: PoleImage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pole.error) return;
    navigator.clipboard.writeText(pole.error).then(() => {
      setCopiedErrorId(pole.id);
      setTimeout(() => setCopiedErrorId((prev) => (prev === pole.id ? null : prev)), 1500);
    });
  };

  // Filter completed or active poles matching the search term
  const filteredPoles = poles.filter((pole) => {
    const term = searchTerm.toLowerCase();
    const matchesLineName = pole.lineName?.toLowerCase().includes(term);
    const matchesComputerizedNumber = pole.computerizedNumber?.toLowerCase().includes(term);
    const matchesLineNumber = pole.lineNumber?.toLowerCase().includes(term);
    const matchesFileName = pole.name.toLowerCase().includes(term);
    return matchesLineName || matchesComputerizedNumber || matchesLineNumber || matchesFileName;
  });

  // Export to CSV
  const handleDownloadCSV = () => {
    if (poles.length === 0) return;

    // Header with UTF-8 BOM so Excel opens Korean characters correctly
    let csvContent = "﻿";
    csvContent += "No,파일명,선로명,전산화번호,선로번호,신뢰도(%),기타 정보,분석상태,등록시간\n";

    poles.forEach((pole, index) => {
      const row = [
        index + 1,
        `"${pole.name.replace(/"/g, '""')}"`,
        `"${(pole.lineName || "미검출").replace(/"/g, '""')}"`,
        `"${(pole.computerizedNumber || "미검출").replace(/"/g, '""')}"`,
        `"${(pole.lineNumber || "미검출").replace(/"/g, '""')}"`,
        pole.confidence || 0,
        `"${(pole.extraInfo || "").replace(/"/g, '""')}"`,
        pole.status === "completed" ? "성공" : pole.status === "failed" ? "실패" : "대기중",
        pole.uploadedAt,
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `전주번호찰_선로추출_결과_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to Clipboard (TSV format for Excel pasting)
  const handleCopyToClipboard = () => {
    if (poles.length === 0) return;

    let tsvText = "No\t파일명\t선로명\t전산화번호\t선로번호\t신뢰도(%)\t기타 정보\t등록시간\n";
    poles.forEach((pole, index) => {
      tsvText += `${index + 1}\t${pole.name}\t${pole.lineName || "미검출"}\t${pole.computerizedNumber || "미검출"}\t${pole.lineNumber || "미검출"}\t${pole.confidence || 0}\t${pole.extraInfo || ""}\t${pole.uploadedAt}\n`;
    });

    navigator.clipboard.writeText(tsvText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
      {/* Table Action Controls */}
      <div className="p-3.5 border-b border-gray-200 bg-gray-50 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">분석 대상 및 추출 결과</h3>
            <span className="text-[11px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded font-mono">
              {poles.length}건 로드됨
            </span>
          </div>

          {/* Download Buttons */}
          {poles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Copy Button */}
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    클립보드 복사됨!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5 text-gray-500" />
                    엑셀용 복사 (TSV)
                  </>
                )}
              </button>

              {/* CSV Button */}
              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1A1C1E] hover:bg-black text-white rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                엑셀 다운로드 (.csv)
              </button>

              {/* Clear All */}
              <button
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold hover:bg-red-50 text-red-600 border border-transparent rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                목록 비우기
              </button>
            </div>
          )}
        </div>

        {/* Search: 분석 대상 및 추출 결과 타이틀 아래 별도 줄 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-[200px] w-full">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="선로명, 번호, 파일명 실시간 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 w-full text-xs border border-gray-300 rounded outline-none hover:border-gray-400 focus:border-blue-500 transition-all bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Table Render */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
              <th className="py-2 px-3 text-center w-12 border-r border-gray-200">번호</th>
              <th className="py-2 px-3 w-14 text-center border-r border-gray-200">미리보기</th>
              <th className="py-2 px-3 border-r border-gray-200">파일명</th>
              <th className="py-2 px-3 border-r border-gray-200">전산화번호</th>
              <th className="py-2 px-3 border-r border-gray-200">선로명</th>
              <th className="py-2 px-3 border-r border-gray-200">선로번호</th>
              <th className="py-2 px-3 border-r border-gray-200">기타 세부 정보</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-24">정확도</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-24">판독 상태</th>
              <th className="py-2 px-3 text-center border-r border-gray-200 w-32">작업</th>
              <th className="py-2 px-3 text-center w-16">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {filteredPoles.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400 text-[11px]">
                  {searchTerm ? "검색 결과와 일치하는 선로 정보가 없습니다." : "표시할 추출 결과 데이터가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredPoles.map((pole, index) => {
                const isSelected = pole.id === selectedId;
                return (
                  <tr
                    key={pole.id}
                    onClick={() => onSelect(pole.id)}
                    className={`text-[12px] hover:bg-blue-50/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/30 font-bold" : ""
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-gray-400 font-mono border-r border-gray-100">
                      {String(index + 1).padStart(3, "0")}
                    </td>
                    <td className="py-1 px-3 text-center border-r border-gray-100">
                      <div
                        className="w-8 h-11 rounded bg-gray-100 border border-gray-200 overflow-hidden inline-flex items-center justify-center cursor-zoom-in"
                        onMouseEnter={(e) => handlePreviewEnter(pole, e)}
                        onMouseLeave={handlePreviewLeave}
                      >
                        <img
                          src={pole.url}
                          alt="preview"
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700 border-r border-gray-100">
                      <p className="font-mono truncate max-w-[140px]" title={pole.name}>
                        {pole.name}
                      </p>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5">{pole.uploadedAt}</p>
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      {pole.status === "completed" ? (
                        <span className="font-extrabold font-mono text-blue-800 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                          {pole.computerizedNumber || "-"}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      {pole.status === "completed" ? (
                        <span className="font-extrabold text-blue-700 font-sans">
                          {pole.lineName || "-"}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100">
                      {pole.status === "completed" ? (
                        <span className="font-extrabold text-blue-700 font-sans">
                          {pole.lineNumber || "-"}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-500 truncate max-w-[150px] border-r border-gray-100" title={pole.extraInfo || ""}>
                      {pole.status === "completed" ? pole.extraInfo || "-" : "-"}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100">
                      {pole.status === "completed" && pole.confidence ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-12 bg-gray-200 h-1 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${
                                pole.confidence >= 90 ? "bg-green-500" : pole.confidence >= 70 ? "bg-blue-500" : "bg-red-500"
                              }`}
                              style={{ width: `${pole.confidence}%` }}
                            />
                          </div>
                          <span className={`inline-block text-[10px] font-extrabold font-mono px-1 py-0.2 rounded ${
                            pole.confidence >= 90
                              ? "bg-green-50 text-green-700"
                              : pole.confidence >= 70
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-700"
                          }`}>
                            {pole.confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-100">
                      {pole.status === "completed" && (
                        <span className="inline-block text-[10px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider">
                          추출완료
                        </span>
                      )}
                      {pole.status === "failed" && (
                        <button
                          onClick={(e) => handleCopyError(pole, e)}
                          title={pole.error ? `${pole.error}\n(클릭하여 실패 사유 복사)` : "실패"}
                          className="inline-block bg-red-50 hover:bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider cursor-pointer"
                        >
                          {copiedErrorId === pole.id ? "복사됨!" : "실패"}
                        </button>
                      )}
                      {pole.status === "processing" && (
                        <span className="inline-block text-[10px] bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 font-extrabold tracking-wider animate-pulse">
                          분석중
                        </span>
                      )}
                      {pole.status === "idle" && (
                        <span className="inline-block text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-bold tracking-wider">
                          대기중
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-stretch gap-1 w-full">
                        <button
                          onClick={() => onOpenDetail(pole.id)}
                          onMouseEnter={(e) => handlePreviewEnter(pole, e)}
                          onMouseLeave={handlePreviewLeave}
                          title="상세 및 수정"
                          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-gray-900 hover:bg-black text-white rounded font-bold whitespace-nowrap text-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          상세보기
                        </button>
                        {pole.status === "processing" ? (
                          <span className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 text-blue-400 rounded font-bold whitespace-nowrap text-sm">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            분석 중...
                          </span>
                        ) : (
                          <button
                            onClick={() => onAnalyze(pole.id)}
                            title={pole.status === "completed" ? "재분석" : "분석 시작"}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 font-bold whitespace-nowrap text-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {pole.status === "completed" ? "재분석" : "분석 시작"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRemove(pole.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 상세보기 버튼 호버 시: 크롭된 번호판 이미지 미리보기 */}
      {hoveredPole && hoverPos && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ top: hoverPos.top - 8, left: hoverPos.left, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-1.5">
            <img
              src={cropCache[hoveredPole.id] || hoveredPole.url}
              alt="번호판 미리보기"
              className="max-w-[220px] max-h-[280px] object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
