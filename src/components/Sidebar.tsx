import React from "react";
import { Cpu, Scissors, Settings, Menu, X, Info, TreeDeciduous, ShieldCheck, Building2, Users, HardHat, UserRound, LogOut, ClipboardList } from "lucide-react";
import { APP_VERSION } from "../lib/version";

export type ViewId =
  | "workplaces"
  | "main"
  | "pruning"
  | "pruning-guide"
  | "about"
  | "admin-companies"
  | "admin-users"
  | "admin-workplaces";

// 로그인 도입 전까지는 null(게스트)로 표시한다.
export interface CurrentUser {
  name: string;
  companyName: string | null;
}

interface SidebarProps {
  currentUser?: CurrentUser | null;
  isAdmin: boolean;
  onLogout: () => void;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
}

export const HOME_VIEW: ViewId = "workplaces";

const navItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "workplaces", label: "작업장 목록", icon: ClipboardList },
  { id: "pruning", label: "전지작업", icon: Scissors },
  { id: "main", label: "번호찰추출", icon: Cpu },
];

const adminItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "admin-companies", label: "회사", icon: Building2 },
  { id: "admin-users", label: "사용자", icon: Users },
  { id: "admin-workplaces", label: "작업장", icon: HardHat },
];

function SidebarContent({ view, isAdmin, onNavigate, onOpenSettings }: Pick<SidebarProps, "view" | "isAdmin" | "onNavigate" | "onOpenSettings">) {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              view === id
                ? "gradient-accent text-white shadow-sm"
                : "text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}

        {isAdmin && (
        <div className="pt-3 mt-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-white/50">
            <ShieldCheck className="w-4 h-4" />
            관리자
          </div>
          {adminItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-2 rounded-lg text-sm transition-colors ${
                view === id
                  ? "gradient-accent text-white font-semibold shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        )}
      </nav>

      <div className="p-2 border-t border-white/10 shrink-0 space-y-0.5">
        <button
          onClick={() => onNavigate("pruning-guide")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            view === "pruning-guide"
              ? "gradient-accent text-white font-semibold shadow-sm"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          <TreeDeciduous className="w-4 h-4" />
          수목전지 기초
        </button>
        <button
          onClick={() => onNavigate("about")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            view === "about"
              ? "gradient-accent text-white font-semibold shadow-sm"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Info className="w-4 h-4" />
          번호찰이란?
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          AI 설정
        </button>
      </div>

      <div className="px-3 py-2 border-t border-white/10 shrink-0 text-center text-[10px] text-white/40 font-mono">
        {APP_VERSION}
      </div>
    </div>
  );
}

export default function Sidebar({ currentUser, isAdmin, onLogout, view, onNavigate, onOpenSettings, isMobileOpen, onOpenMobile, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Top header (전체 폭 고정) */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-navy flex items-center justify-between gap-3 pl-2 pr-4 md:pl-4">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 text-white/80 hover:text-white hover:bg-navy-dark rounded-lg transition-colors"
            title="메뉴"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => onNavigate(HOME_VIEW)} title="홈으로 이동" className="flex items-center gap-2.5 min-w-0 text-left">
            <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white leading-tight truncate">AI 전주번호찰 선로 정보 추출기</h1>
              <p className="hidden md:block text-[11px] text-white/60 leading-tight truncate">배전선로 전주번호찰 추출 · 수목전지 작업 관리</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right leading-tight">
            <p className="text-sm font-bold text-white">{currentUser ? `${currentUser.name} 님` : "게스트"}</p>
            <span className="inline-block mt-0.5 px-2 py-px rounded-full bg-amber-light text-amber-dark text-[11px] font-semibold">
              {currentUser ? currentUser.companyName || "소속 없음" : "로그인 전"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={onLogout}
            title="로그아웃"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar (헤더 아래) */}
      <aside className="hidden md:flex md:flex-col w-[168px] shrink-0 bg-navy border-t border-white/10 h-[calc(100vh-3.5rem)] sticky top-14">
        <SidebarContent view={view} isAdmin={isAdmin} onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-navy shadow-lg flex flex-col">
            <div className="flex items-center justify-end p-2 border-b border-white/10">
              <button
                onClick={onCloseMobile}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              view={view}
              isAdmin={isAdmin}
              onNavigate={(v) => {
                onNavigate(v);
                onCloseMobile();
              }}
              onOpenSettings={() => {
                onOpenSettings();
                onCloseMobile();
              }}
            />
          </aside>
        </div>
      )}
    </>
  );
}
