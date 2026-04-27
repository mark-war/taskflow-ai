import { useState } from "react";
import {
  Search,
  Filter,
  Users,
  Zap,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { useUIStore } from "@/store/index";
import { useTaskStore } from "@/store/index";
import clsx from "clsx";

export default function BoardHeader({ board }) {
  const { setAIBarOpen } = useUIStore();
  const { tasks } = useTaskStore();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  if (!board) return null;

  const activeSprint = board.sprints?.find((s) => s.id === board.activeSprint);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Board info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{board.emoji || "📋"}</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">{board.name}</h2>
            {activeSprint && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-subtle)]">
                <Calendar size={9} />
                <span>Sprint: {activeSprint.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {pct}%
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="input pl-8 text-xs h-8 w-44"
          />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input text-xs h-8 pr-7 appearance-none cursor-pointer"
          >
            <option value="">All priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none"
          />
        </div>

        {/* AI shortcut button */}
        <button
          onClick={() => setAIBarOpen(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Zap size={12} />
          AI Command
          <kbd className="text-white/60 text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}
