import { useUIStore, usePresenceStore, useBoardStore } from "@/store/index";
import { useAuthStore } from "@/store/authStore";
import {
  Sparkles,
  LayoutGrid,
  GanttChartSquare,
  List,
  Search,
  Bell,
  Moon,
  Sun,
} from "lucide-react";
import { useThemeStore } from "@/store/index";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import clsx from "clsx";

const VIEWS = [
  { id: "kanban", Icon: LayoutGrid, label: "Board" },
  { id: "timeline", Icon: GanttChartSquare, label: "Timeline" },
  { id: "list", Icon: List, label: "List" },
];

export default function Topbar() {
  const { toggleAIBar, activeView, setActiveView } = useUIStore();
  const { members } = usePresenceStore();
  const { currentBoard } = useBoardStore();
  const { theme, setTheme } = useThemeStore();
  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const onBoardPage = !!boardId;

  const handleViewChange = (view) => {
    setActiveView(view);
    if (!boardId) return;
    if (view === "timeline") navigate(`/board/${boardId}/timeline`);
    else navigate(`/board/${boardId}`);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {currentBoard && (
          <>
            <span className="text-base">{currentBoard.emoji || "📋"}</span>
            <h1 className="font-semibold text-sm truncate">
              {currentBoard.name}
            </h1>
          </>
        )}
      </div>

      {/* Center: view switcher (board pages only) */}
      {onBoardPage && (
        <div className="flex items-center gap-0.5 bg-[var(--color-bg)] rounded-lg p-0.5 border border-[var(--color-border)]">
          {VIEWS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => handleViewChange(id)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                activeView === id
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Presence avatars */}
        {members.length > 0 && (
          <div className="flex -space-x-2 mr-1.5">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                title={m.name}
                className="w-7 h-7 rounded-full bg-brand-500 border-2 border-[var(--color-surface)] flex items-center justify-center text-white text-xs font-medium"
              >
                {m.name?.[0]?.toUpperCase()}
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-[var(--color-border)] border-2 border-[var(--color-surface)] flex items-center justify-center text-xs font-medium text-[var(--color-text-muted)]">
                +{members.length - 5}
              </div>
            )}
          </div>
        )}

        {/* AI Bar trigger */}
        <button
          onClick={toggleAIBar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 text-xs font-medium transition-colors border border-brand-500/20"
        >
          <Sparkles size={13} />
          <span>Ask AI</span>
          <span className="text-brand-500/60 text-[10px]">⌘K</span>
        </button>

        <button onClick={toggleTheme} className="btn-ghost p-2">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="btn-ghost p-2 relative">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
