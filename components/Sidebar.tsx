"use client";

import type { ReactNode } from "react";
import {
  MoreHorizontal,
  PanelLeft,
  Search,
  Sparkles,
  SquarePen,
  Store,
} from "lucide-react";

export type ChatView = "chat" | "matches";

export interface RecentItem {
  id: string;
  title: string;
  active?: boolean;
}

interface Props {
  displayName: string;
  recents?: RecentItem[];
  view: ChatView;
  onView: (v: ChatView) => void;
  onNewChat: () => void;
  onCloseSidebar?: () => void;
  matchCount?: number;
}

interface ItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}

function SidebarItem({ icon, label, active, onClick, trailing }: ItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] transition-colors ${
        active
          ? "bg-[var(--active-bg)] text-[var(--text)]"
          : "text-[var(--text)] hover:bg-[var(--hover-bg)]"
      }`}
    >
      <span className="text-[var(--text-muted)] flex items-center justify-center w-5">
        {icon}
      </span>
      <span className="flex-1 text-left truncate">{label}</span>
      {trailing}
    </button>
  );
}

function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white border border-[var(--border)] text-[var(--text-muted)] font-medium">
      {children}
    </span>
  );
}

export default function Sidebar({
  displayName,
  recents = [],
  view,
  onView,
  onNewChat,
  onCloseSidebar,
  matchCount = 0,
}: Props) {
  return (
    <aside className="w-[260px] shrink-0 surface-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="px-2 text-[15px] font-semibold text-[var(--text)]">
          Intent
        </span>
        {onCloseSidebar && (
          <button
            onClick={onCloseSidebar}
            className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
            aria-label="Close sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Primary items */}
      <nav className="px-2 pt-1 pb-3 space-y-0.5">
        <SidebarItem
          icon={<SquarePen size={17} />}
          label="New chat"
          active={view === "chat"}
          onClick={onNewChat}
        />
        <SidebarItem
          icon={<Search size={17} />}
          label="Search chats"
          onClick={() => {}}
        />
        <SidebarItem
          icon={<Sparkles size={17} />}
          label="Matches"
          active={view === "matches"}
          onClick={() => onView("matches")}
          trailing={matchCount > 0 ? <CountPill>{matchCount}</CountPill> : null}
        />
        <SidebarItem
          icon={<MoreHorizontal size={17} />}
          label="More"
          onClick={() => {}}
        />
      </nav>

      {/* Recents */}
      <div className="flex-1 overflow-y-auto px-2">
        {recents.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-2 text-[12px] font-medium text-[var(--text-subtle)]">
              Recents
            </div>
            <div className="space-y-0.5 pb-3">
              {recents.map((r) => (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[14px] truncate transition-colors ${
                    r.active
                      ? "bg-[var(--active-bg)] text-[var(--text)]"
                      : "text-[var(--text)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  {r.title}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Account */}
      <div className="px-2 pb-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-default">
          <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-[12px] font-semibold flex items-center justify-center">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[var(--text)] truncate">
              {displayName || "Guest"}
            </div>
            <div className="text-[11px] text-[var(--text-subtle)]">Beta</div>
          </div>
          <button
            className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
            aria-label="Open store"
          >
            <Store size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
