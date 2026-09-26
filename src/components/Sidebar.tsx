import React from "react";
import { Cpu, Scissors, Settings, Menu, X, Info, TreeDeciduous, ShieldCheck, Building2, Users, HardHat, UserRound, LogOut, ClipboardList } from "lucide-react";
import { APP_VERSION } from "../lib/version";
import logoUrl from "../../icons/icon-192.png";

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
  canManageWorkplaces: boolean;
  onLogout: () => void;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
}

export const HOME_VIEW: ViewId = "workplaces";

type NavItem = { id: ViewId; label: string; icon: React.ElementType };

// 작업장(추가·수정·삭제)은 총괄관리자와 회사관리자에게만 보인다.
function getNavItems(canManageWorkplaces: boolean): NavItem[] {
  return [
    { id: "workplaces", label: "작업장 목록", icon: ClipboardList },
    { id: "pruning", label: "전지작업", icon: Scissors },
    ...(canManageWorkplaces ? [{ id: "admin-workplaces" as ViewId, label: "작업장", icon: HardHat }] : []),
    { id: "main", label: "번호찰추출", icon: Cpu },
  ];
}

// 설정(관리자) 메뉴는 총괄관리자(admin)에게만 보인다.
const adminItems: NavItem[] = [
  { id: "admin-companies", label: "회사", icon: Building2 },
  { id: "admin-users", label: "사용자", icon: Users },
];

function SidebarContent({ view, isAdmin, canManageWorkplaces, onNavigate, onOpenSettings }: Pick<SidebarProps, "view" | "isAdmin" | "canManageWorkplaces" | "onNavigate" | "onOpenSettings">) {
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {getNavItems(canManageWorkplaces).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              view === id
                ? "bg-violet-soft text-text"
                : "text-text-soft hover:bg-panel-2 hover:text-text"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}

        {isAdmin && (
        <div className="pt-3 mt-3 border-t border-line">
          <div className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-text-soft tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            설정(관리자)
          </div>
          {adminItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-2 rounded-lg text-sm transition-colors ${
                view === id
                  ? "bg-violet-soft text-text font-semibold"
                  : "text-text-soft hover:bg-panel-2 hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        )}
      </nav>

      <div className="p-2 border-t border-line shrink-0 space-y-0.5">
        <button
          onClick={() => onNavigate("pruning-guide")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            view === "pruning-guide"
              ? "bg-violet-soft text-text font-semibold"
              : "text-text-soft hover:bg-panel-2 hover:text-text"
          }`}
        >
          <TreeDeciduous className="w-4 h-4" />
          수목전지 기초
        </button>
        <button
          onClick={() => onNavigate("about")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            view === "about"
              ? "bg-violet-soft text-text font-semibold"
              : "text-text-soft hover:bg-panel-2 hover:text-text"
          }`}
        >
          <Info className="w-4 h-4" />
          번호찰이란?
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-text-soft hover:bg-panel-2 hover:text-text transition-colors"
        >
          <Settings className="w-4 h-4" />
          AI 설정
        </button>
      </div>

      <div className="px-3 py-2 border-t border-line shrink-0 text-center text-[10px] text-text-soft font-mono">
        {APP_VERSION}
      </div>
    </div>
  );
}

export default function Sidebar({ currentUser, isAdmin, canManageWorkplaces, onLogout, view, onNavigate, onOpenSettings, isMobileOpen, onOpenMobile, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Top header (전체 폭 고정) */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-bg-2 border-b border-line flex items-center justify-between gap-3 pl-2 pr-4 md:pl-4">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 text-text-soft hover:text-text hover:bg-panel-2 rounded-lg transition-colors"
            title="메뉴"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => onNavigate(HOME_VIEW)} title="홈으로 이동" className="flex items-center gap-2.5 min-w-0 text-left">
            <img src={logoUrl} alt="WattLine 로고" className="w-8 h-8 rounded-lg shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text leading-tight truncate">수목전지 작업관리</h1>
              <p className="hidden md:block text-[11px] text-text-soft leading-tight truncate">배전선로 전주번호찰 추출 · 수목전지 작업 관리</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right leading-tight">
            <p className="text-sm font-bold text-text">{currentUser ? `${currentUser.name} 님` : "게스트"}</p>
            <span className="inline-block mt-0.5 px-2 py-px rounded-full bg-violet-soft text-blue text-[11px] font-semibold">
              {currentUser ? currentUser.companyName || "소속 없음" : "로그인 전"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-panel-2 border border-line flex items-center justify-center">
            <UserRound className="w-5 h-5 text-text-soft" />
          </div>
          <button
            onClick={onLogout}
            title="로그아웃"
            className="p-2 text-text-soft hover:text-text hover:bg-panel-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar (헤더 아래) */}
      <aside className="hidden md:flex md:flex-col w-[168px] shrink-0 bg-bg-2 border-r border-line h-[calc(100vh-3.5rem)] sticky top-14">
        <SidebarContent view={view} isAdmin={isAdmin} canManageWorkplaces={canManageWorkplaces} onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-bg-2 border-r border-line shadow-card flex flex-col">
            <div className="flex items-center justify-end p-2 border-b border-line">
              <button
                onClick={onCloseMobile}
                className="p-2 text-text hover:text-text hover:bg-panel-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              view={view}
              isAdmin={isAdmin}
              canManageWorkplaces={canManageWorkplaces}
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
