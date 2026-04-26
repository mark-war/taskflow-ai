import { NavLink, useParams } from "react-router-dom";
import { useUIStore, useBoardStore } from "@/store/index";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard,
  ChevronLeft,
  Plus,
  Settings,
  Users,
  Zap,
  Clock,
  MoreHorizontal,
  Hash,
} from "lucide-react";
import { useState, useEffect } from "react";
import { boardsAPI } from "@/services/api";
import clsx from "clsx";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { boards, setBoards } = useBoardStore();
  const { user } = useAuthStore();
  const { boardId } = useParams();
  const [creating, setCreating] = useState(false);

  const activeTeam = user?.teams?.[0];

  useEffect(() => {
    if (!activeTeam) return;
    boardsAPI
      .list(activeTeam._id || activeTeam)
      .then((r) => setBoards(r.data.boards))
      .catch(() => {});
  }, [activeTeam]);

  const navItem = (to, Icon, label) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
          isActive
            ? "bg-brand-500/10 text-brand-500 font-medium"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
        )
      }
    >
      <Icon size={16} className="flex-shrink-0" />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return (
    <aside className="h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm">TaskFlow AI</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] ml-auto"
        >
          <ChevronLeft
            size={15}
            className={clsx(
              "transition-transform duration-200",
              !sidebarOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItem("/", LayoutDashboard, "Dashboard")}
        {navItem(`/team/${activeTeam?._id || activeTeam}`, Users, "Team")}

        {/* Boards */}
        {sidebarOpen && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                Boards
              </span>
              <button
                onClick={() => setCreating(true)}
                className="p-0.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="space-y-0.5">
              {boards.map((board) => (
                <NavLink
                  key={board._id}
                  to={`/board/${board._id}`}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 group",
                      isActive
                        ? "bg-brand-500/10 text-brand-500 font-medium"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
                    )
                  }
                >
                  <span className="text-base leading-none">
                    {board.emoji || "📋"}
                  </span>
                  <span className="truncate flex-1">{board.name}</span>
                </NavLink>
              ))}
              {boards.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--color-text-subtle)]">
                  No boards yet
                </p>
              )}
            </div>
          </div>
        )}

        {!sidebarOpen &&
          boards.slice(0, 6).map((board) => (
            <NavLink
              key={board._id}
              to={`/board/${board._id}`}
              className={({ isActive }) =>
                clsx(
                  "flex items-center justify-center p-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-500/10 text-brand-500"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]",
                )
              }
              title={board.name}
            >
              <span className="text-base leading-none">
                {board.emoji || "📋"}
              </span>
            </NavLink>
          ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--color-border)]">
        {navItem("/settings", Settings, "Settings")}
        {sidebarOpen && user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-[var(--color-text-subtle)] truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
