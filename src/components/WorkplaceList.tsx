import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { AuthUser, authHeaders } from "../lib/auth";

interface Workplace {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_completed: boolean;
  memo: string | null;
  company: { name: string } | null;
  workers: { user: { name: string } | null }[];
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status}). 서버를 재시작했는지 확인하세요.`);
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export default function WorkplaceList({ user, onOpenWorkplace }: { user: AuthUser; onOpenWorkplace: (id: string) => void }) {
  const isAdmin = user.role === "admin";
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [items, setItems] = useState<Workplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 관리자만 회사 선택지가 필요하다.
  useEffect(() => {
    if (!isAdmin) return;
    getJson("/api/admin?entity=companies")
      .then((d) => setCompanies(d.items))
      .catch((e) => setError(e.message));
  }, [isAdmin]);

  const load = () => {
    setLoading(true);
    setError(null);
    getJson(`/api/workplaces${companyId ?`?companyId=${companyId}`: ""}`)
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [companyId]);

  const doneCount = items.filter((w) => w.is_completed).length;
  const showCompany = isAdmin && !companyId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-text">작업장 목록</h2>
          <p className="text-text-soft mt-0.5">
            {isAdmin ? "회사를 선택해 작업장을 확인합니다." : `${user.companyName || "소속 회사"}의 작업장입니다.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="text-sm border border-line rounded-md px-2 py-2 bg-panel"
            >
              <option value="">전체 회사</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={load}
            title="새로고침"
            className="p-2 text-text-soft hover:text-blue hover:bg-panel-2 rounded-md border border-line bg-panel"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!loading && !error && (
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-panel-2 text-text-soft font-semibold">전체 {items.length}</span>
          <span className="px-2.5 py-1 rounded-full bg-amber/15 text-amber font-semibold">미완료 {items.length - doneCount}</span>
          <span className="px-2.5 py-1 rounded-full bg-green/15 text-green font-semibold">완료 {doneCount}</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="rounded-[22px] border border-line bg-panel shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-text-soft">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap w-24">작업완료</th>
              {showCompany && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">회사</th>}
              <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">작업장명</th>
              <th className="px-3 py-2.5 text-left font-semibold">작업내용</th>
              <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">작업기간</th>
              <th className="px-3 py-2.5 text-left font-semibold">작업자</th>
              <th className="px-3 py-2.5 text-left font-semibold">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-soft">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-soft">
                  {!isAdmin && !user.companyName ? "소속 회사가 지정되지 않았습니다. 관리자에게 문의하세요." : "등록된 작업장이 없습니다."}
                </td>
              </tr>
            ) : (
              items.map((w) => (
                <tr key={w.id} className="hover:bg-panel-2 align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {w.is_completed ? (
                      <span className="px-2 py-0.5 rounded-full bg-green/15 text-green font-semibold">완료</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber/15 text-amber font-semibold">미완료</span>
                    )}
                  </td>
                  {showCompany && <td className="px-3 py-2.5 text-text-soft whitespace-nowrap">{w.company?.name}</td>}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => onOpenWorkplace(w.id)}
                      title="전지작업으로 이동"
                      className="font-semibold text-blue hover:text-blue underline underline-offset-2"
                    >
                      {w.name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-text-soft whitespace-pre-line">{w.description}</td>
                  <td className="px-3 py-2.5 text-text-soft whitespace-nowrap">
                    {w.start_date || w.end_date ? `${w.start_date || "?"} ~ ${w.end_date || ""}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-text-soft">
                    {w.workers.map((x) => x.user?.name).filter(Boolean).join(",")}
                  </td>
                  <td className="px-3 py-2.5 text-text-soft whitespace-pre-line">{w.memo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
