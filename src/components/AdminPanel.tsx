import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import { authHeaders } from "../lib/auth";

export type AdminEntity = "companies" | "users" | "workplaces";

type Row = Record<string, any>;

type FieldType = "text" | "password" | "textarea" | "date" | "checkbox" | "company" | "role" | "workers";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

const TITLES: Record<AdminEntity, string> = {
  companies: "회사 관리",
  users: "사용자 관리",
  workplaces: "작업장 관리",
};

const DESCRIPTIONS: Record<AdminEntity, string> = {
  companies: "한전 협력사 목록을 관리합니다.",
  users: "사용자 계정과 소속 회사를 관리합니다.",
  workplaces: "협력사별 작업장과 작업자를 관리합니다.",
};

const FIELDS: Record<AdminEntity, Field[]> = {
  companies: [
    { key: "name", label: "회사명", type: "text", required: true },
    { key: "business_no", label: "사업자번호", type: "text" },
    { key: "ceo_name", label: "대표자", type: "text" },
    { key: "address", label: "주소", type: "text" },
    { key: "phone", label: "전화", type: "text" },
    { key: "memo", label: "비고", type: "textarea" },
  ],
  users: [
    { key: "login_id", label: "아이디", type: "text", required: true },
    { key: "password", label: "비밀번호", type: "password" },
    { key: "name", label: "사용자명", type: "text", required: true },
    { key: "company_id", label: "소속 회사", type: "company" },
    { key: "phone", label: "연락처", type: "text" },
    { key: "role", label: "역할", type: "role" },
    { key: "is_active", label: "사용", type: "checkbox" },
  ],
  workplaces: [
    { key: "company_id", label: "회사", type: "company", required: true },
    { key: "name", label: "작업장명", type: "text", required: true },
    { key: "description", label: "작업내용", type: "textarea" },
    { key: "start_date", label: "작업시작일", type: "date" },
    { key: "end_date", label: "작업종료일", type: "date" },
    { key: "is_completed", label: "작업완료", type: "checkbox" },
    { key: "worker_ids", label: "작업자", type: "workers" },
    { key: "memo", label: "비고", type: "textarea" },
  ],
};

const EMPTY: Record<AdminEntity, Row> = {
  companies: {},
  users: { role: "worker", is_active: true },
  workplaces: { is_completed: false, worker_ids: [] },
};

const ROLE_LABEL: Record<string, string> = { admin: "관리자", company_admin: "회사관리자", worker: "일반사용자" };

async function api(entity: AdminEntity, method: string, body?: any) {
  const res = await fetch(`/api/admin?entity=${entity}`, {
    method,
    headers: { ...authHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  // JSON이 아닌 응답(예: 서버 재시작 전이라 라우트가 없어 소스 파일이 내려온 경우)도 오류로 처리한다.
  if (!data) throw new Error(`서버 응답을 해석할 수 없습니다 (${res.status}). 서버를 재시작했는지 확인하세요.`);
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export default function AdminPanel({ entity }: { entity: AdminEntity }) {
  const [items, setItems] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [companyFilter, setCompanyFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 회사 목록은 모든 화면의 선택지/표시에 필요하고, 사용자 목록은 작업장의 작업자 선택에 필요하다.
      const [main, comp, usr] = await Promise.all([
        api(entity, "GET"),
        entity === "companies" ? null : api("companies", "GET"),
        entity === "workplaces" ? api("users", "GET") : null,
      ]);
      setItems(main.items);
      if (comp) setCompanies(comp.items);
      if (usr) setUsers(usr.items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    setCompanyFilter("");
    load();
  }, [load]);

  const userName = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const visibleItems = companyFilter ? items.filter((r) => r.company_id === companyFilter) : items;

  const openEdit = (row: Row) => {
    if (entity === "workplaces") {
      setEditing({ ...row, worker_ids: (row.workers || []).map((w: Row) => w.user_id) });
    } else {
      setEditing({ ...row });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(entity, "DELETE", { id: deleting.id });
      setDeleting(null);
      load();
    } catch (e: any) {
      setError(e.message);
      setDeleting(null);
    }
  };

  const columns: { label: string; render: (r: Row) => React.ReactNode }[] =
    entity === "companies"
      ? [
          { label: "회사명", render: (r) => <span className="font-semibold">{r.name}</span> },
          { label: "사업자번호", render: (r) => r.business_no },
          { label: "대표자", render: (r) => r.ceo_name },
          { label: "주소", render: (r) => r.address },
          { label: "전화", render: (r) => r.phone },
        ]
      : entity === "users"
      ? [
          { label: "아이디", render: (r) => <span className="font-mono">{r.login_id}</span> },
          { label: "사용자명", render: (r) => <span className="font-semibold">{r.name}</span> },
          { label: "소속 회사", render: (r) => r.company?.name },
          { label: "연락처", render: (r) => r.phone },
          { label: "역할", render: (r) => ROLE_LABEL[r.role] || r.role },
          {
            label: "사용",
            render: (r) => (r.is_active ? <span className="text-green">사용</span> : <span className="text-text-soft">중지</span>),
          },
        ]
      : [
          { label: "회사", render: (r) => r.company?.name },
          { label: "작업장명", render: (r) => <span className="font-semibold">{r.name}</span> },
          { label: "작업내용", render: (r) => <span className="line-clamp-2">{r.description}</span> },
          { label: "기간", render: (r) => [r.start_date, r.end_date].filter(Boolean).join("~") },
          {
            label: "완료",
            render: (r) =>
              r.is_completed ? (
                <span className="px-2 py-0.5 rounded-full bg-green/15 text-green text-xs font-semibold">완료</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber/15 text-amber text-xs font-semibold">진행중</span>
              ),
          },
          {
            label: "작업자",
            render: (r) => (r.workers || []).map((w: Row) => userName.get(w.user_id)).filter(Boolean).join(","),
          },
        ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">{TITLES[entity]}</h2>
          <p className="text-xs text-text-soft mt-0.5">{DESCRIPTIONS[entity]}</p>
        </div>
        <div className="flex items-center gap-2">
          {entity !== "companies" && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-sm border border-line rounded-lg px-2 py-2 bg-panel"
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
            className="p-2 text-text-soft hover:text-blue hover:bg-panel-2 rounded-lg border border-line bg-panel"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setEditing({
                ...EMPTY[entity],
                // 선택할 회사가 하나뿐이면(회사관리자) 자동으로 지정한다.
                company_id: companyFilter || (companies.length === 1 ? companies[0].id : undefined),
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-hover"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-sm text-red flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-panel border border-line rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-text-soft text-xs">
            <tr>
              {columns.map((c) => (
                <th key={c.label} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center text-text-soft">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center text-text-soft">등록된 항목이 없습니다.</td>
              </tr>
            ) : (
              visibleItems.map((r) => (
                <tr key={r.id} className="hover:bg-panel-2">
                  {columns.map((c) => (
                    <td key={c.label} className="px-3 py-2.5 text-text-soft">{c.render(r)}</td>
                  ))}
                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <button onClick={() => openEdit(r)} title="수정" className="p-1.5 text-text-soft hover:text-blue">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleting(r)} title="삭제" className="p-1.5 text-text-soft hover:text-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          entity={entity}
          initial={editing}
          companies={companies}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px]" onClick={() => setDeleting(null)} />
          <div className="relative bg-panel rounded-3xl shadow-card p-5 w-full max-w-sm space-y-4">
            <p className="text-sm text-text">
              <span className="font-semibold">{deleting.name}</span> 항목을 삭제할까요? 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="px-3 py-2 text-sm rounded-lg border border-line">취소</button>
              <button onClick={confirmDelete} className="px-3 py-2 text-sm rounded-lg bg-red text-white font-semibold">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({
  entity,
  initial,
  companies,
  users,
  onClose,
  onSaved,
}: {
  entity: AdminEntity;
  initial: Row;
  companies: Row[];
  users: Row[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // 작업자는 선택한 회사 소속 사용자 중에서만 고른다.
  const companyUsers = users.filter((u) => u.company_id === form.company_id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of FIELDS[entity]) {
      if (f.required && !form[f.key]) return setError(`${f.label}을(를) 입력하세요.`);
    }
    if (entity === "users" && isNew && !form.password) return setError("비밀번호를 입력하세요.");
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      return setError("작업종료일이 작업시작일보다 빠릅니다.");
    }

    setSaving(true);
    setError(null);
    try {
      const body = { ...form };
      // 다른 회사로 바뀌었다면 그 회사 소속이 아닌 작업자는 제외한다.
      if (entity === "workplaces") {
        const allowed = new Set(companyUsers.map((u) => u.id));
        body.worker_ids = (form.worker_ids || []).filter((id: string) => allowed.has(id));
      }
      await api(entity, isNew ? "POST" : "PUT", body);
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const inputClass = "w-full text-sm border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-blue";

  const renderField = (f: Field) => {
    const value = form[f.key];
    switch (f.type) {
      case "textarea":
        return <textarea rows={3} value={value || ""} onChange={(e) => set(f.key, e.target.value)} className={inputClass} />;
      case "date":
        return <input type="date" value={value || ""} onChange={(e) => set(f.key, e.target.value)} className={inputClass} />;
      case "password":
        return (
          <input
            type="password"
            autoComplete="new-password"
            placeholder={isNew ? "" : "변경할 때만 입력"}
            value={value || ""}
            onChange={(e) => set(f.key, e.target.value)}
            className={inputClass}
          />
        );
      case "checkbox":
        return (
          <input type="checkbox" checked={!!value} onChange={(e) => set(f.key, e.target.checked)} className="w-4 h-4" />
        );
      case "company":
        return (
          <select value={value || ""} onChange={(e) => set(f.key, e.target.value)} className={inputClass}>
            <option value="">선택 안 함</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        );
      case "role":
        return (
          <select value={value || "worker"} onChange={(e) => set(f.key, e.target.value)} className={inputClass}>
            <option value="worker">일반사용자 (WattLineApp 사진 업로드)</option>
            <option value="company_admin">회사관리자 (소속 회사 작업장 관리)</option>
            <option value="admin">관리자 (전체 시스템)</option>
          </select>
        );
      case "workers": {
        if (!form.company_id) return <p className="text-xs text-text-soft py-2">회사를 먼저 선택하세요.</p>;
        if (companyUsers.length === 0) return <p className="text-xs text-text-soft py-2">이 회사에 등록된 사용자가 없습니다.</p>;
        const selected: string[] = value || [];
        return (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 py-1">
            {companyUsers.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(u.id)}
                  onChange={(e) =>
                    set(f.key, e.target.checked ? [...selected, u.id] : selected.filter((id) => id !== u.id))
                  }
                />
                {u.name}
              </label>
            ))}
          </div>
        );
      }
      default:
        return <input type="text" value={value || ""} onChange={(e) => set(f.key, e.target.value)} className={inputClass} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-panel rounded-3xl shadow-card w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h3 className="font-bold text-text">{TITLES[entity].replace("관리", isNew ? "추가" : "수정")}</h3>
          <button type="button" onClick={onClose} className="p-1 text-text-soft hover:text-blue">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {FIELDS[entity].map((f) => (
            <div key={f.key} className={f.type === "checkbox" ? "flex items-center gap-3" : "space-y-1"}>
              <label className="block text-xs font-semibold text-text-soft">
                {f.label}
                {(f.required || (f.type === "password" && isNew)) && <span className="text-red"> *</span>}
              </label>
              {renderField(f)}
            </div>
          ))}
          {error && <p className="text-sm text-red">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-line">취소</button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue text-white hover:bg-blue-hover font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
