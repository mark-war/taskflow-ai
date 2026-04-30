import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Users,
  Zap,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useUIStore, useTaskStore } from "@/store/index";
import clsx from "clsx";

const PRIORITIES = [
  { value: "", label: "All priorities" },
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

const TYPES = [
  { value: "", label: "All types" },
  { value: "task", label: "✓ Task" },
  { value: "bug", label: "🐛 Bug" },
  { value: "story", label: "📖 Story" },
  { value: "epic", label: "⚡ Epic" },
  { value: "milestone", label: "🏆 Milestone" },
];

export default function BoardHeader({ board, onFilterChange }) {
  const { setAIBarOpen } = useUIStore();
  const { tasks } = useTaskStore();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  if (!board) return null;

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const hasActiveFilters = search || priority || type;

  // Emit filter state upward whenever any filter changes
  useEffect(() => {
    onFilterChange?.({ search, priority, type });
  }, [search, priority, type]);

  const clearFilters = () => {
    setSearch("");
    setPriority("");
    setType("");
  };

  if (!board) return null;

  const activeSprint = board.sprints?.find((s) => s.id === board.activeSprint);

  return (
    <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        {/* Board info */}
        <div className="flex items-center gap-2 min-w-0 mr-2">
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
              {doneCount}/{totalCount}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              ({pct}%)
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
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
          >
            <X size={11} />
          </button>
        )}

        {/* Priority filter */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={clsx(
              "input text-xs h-8 pr-7 appearance-none cursor-pointer",
              priority && "border-brand-500/50 text-brand-500",
            )}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none"
          />
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={clsx(
            "btn-ghost h-8 px-2.5 text-xs gap-1.5",
            showFilters && "bg-[var(--color-surface-hover)]",
            hasActiveFilters && "text-brand-500",
          )}
        >
          <SlidersHorizontal size={13} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center font-bold">
              {[search, priority, type].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost h-8 px-2 text-xs text-red-500 hover:text-red-600"
          >
            <X size={12} /> Clear
          </button>
        )}

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

      {/* Expanded filters row */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <span className="text-xs text-[var(--color-text-subtle)] font-medium">
            Type:
          </span>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={clsx(
                "input text-xs h-7 pr-7 appearance-none cursor-pointer",
                type && "border-brand-500/50 text-brand-500",
              )}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none"
            />
          </div>

          <span className="text-xs text-[var(--color-text-muted)] ml-2">
            Showing{" "}
            {
              tasks.filter(
                (t) =>
                  (!search ||
                    t.title.toLowerCase().includes(search.toLowerCase())) &&
                  (!priority || t.priority === priority) &&
                  (!type || t.type === type),
              ).length
            }{" "}
            of {totalCount} tasks
          </span>
        </div>
      )}
    </div>
  );
}
