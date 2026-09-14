import React from "react";
import { Cpu, Scissors, Settings, Menu, X, Info } from "lucide-react";

export type ViewId = "main" | "pruning" | "about";

interface SidebarProps {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
}

const navItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "main", label: "번호찰추출", icon: Cpu },
  { id: "pruning", label: "전지작업", icon: Scissors },
];

function SidebarContent({ view, onNavigate, onOpenSettings }: Pick<SidebarProps, "view" | "onNavigate" | "onOpenSettings">) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200 shrink-0">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-sm font-bold text-gray-900 leading-tight">AI 전주번호찰<br />선로 정보 추출기</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              view === id
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200 shrink-0 space-y-0.5">
        <button
          onClick={() => onNavigate("about")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            view === "about"
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Info className="w-4 h-4" />
          번호찰이란?
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          AI 설정
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ view, onNavigate, onOpenSettings, isMobileOpen, onOpenMobile, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-[168px] shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0">
        <SidebarContent view={view} onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-bold text-gray-900">AI 전주번호찰 선로 정보 추출기</h1>
        </div>
        <button
          onClick={onOpenMobile}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="메뉴"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-end p-2 border-b border-gray-200">
              <button
                onClick={onCloseMobile}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              view={view}
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
