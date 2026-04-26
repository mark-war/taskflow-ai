import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  LayoutGrid,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useBoardStore } from "@/store/index";
import { boardsAPI, tasksAPI } from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { boards, setBoards } = useBoardStore();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const navigate = useNavigate();

  const activeTeam = user?.teams?.[0];
  const teamId = activeTeam?._id || activeTeam;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    boardsAPI
      .list(teamId)
      .then(async (r) => {
        const boards = r.data.boards;
        setBoards(boards);

        // Aggregate stats from all boards
        let totalTasks = 0,
          done = 0,
          overdue = 0,
          inProgress = 0;
        await Promise.all(
          boards.slice(0, 5).map(async (b) => {
            try {
              const s = await boardsAPI.stats(b._id);
              totalTasks += s.data.total;
              done += s.data.byStatus?.done || 0;
              overdue += s.data.overdue || 0;
              inProgress += s.data.byStatus?.in_progress || 0;
            } catch {}
          }),
        );
        setStats({ totalTasks, done, overdue, inProgress });
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !teamId) return;
    try {
      const { data } = await boardsAPI.create({
        name: newBoardName.trim(),
        team: teamId,
        emoji: "📋",
      });
      setBoards([...boards, data.board]);
      setNewBoardName("");
      setCreatingBoard(false);
      toast.success("Board created!");
      navigate(`/board/${data.board._id}`);
    } catch {
      toast.error("Failed to create board");
    }
  };

  const statCards = [
    {
      label: "Total Tasks",
      value: stats?.totalTasks ?? "—",
      icon: LayoutGrid,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
    },
    {
      label: "Completed",
      value: stats?.done ?? "—",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? "—",
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Overdue",
      value: stats?.overdue ?? "—",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">
          {greeting}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Here's what's happening across your workspace today.
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {s.label}
              </span>
              <div
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  s.bg,
                )}
              >
                <s.icon size={15} className={s.color} />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="skeleton h-7 w-12 rounded" />
              ) : (
                s.value
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI tip banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 p-4 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Try AI commands on your board</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Open any board → press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-[10px]">
              ⌘K
            </kbd>{" "}
            → type what you want done in plain English.
          </p>
        </div>
        <ArrowRight
          size={16}
          className="text-[var(--color-text-subtle)] flex-shrink-0"
        />
      </motion.div>

      {/* Boards grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Your Boards</h2>
          <button
            onClick={() => setCreatingBoard(true)}
            className="btn-primary text-xs py-1.5"
          >
            <Plus size={13} /> New Board
          </button>
        </div>

        {/* New board inline form */}
        {creatingBoard && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 mb-4 flex gap-3"
          >
            <input
              autoFocus
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateBoard();
                if (e.key === "Escape") {
                  setCreatingBoard(false);
                  setNewBoardName("");
                }
              }}
              placeholder="Board name… (e.g. Product Roadmap)"
              className="input flex-1 text-sm"
            />
            <button onClick={handleCreateBoard} className="btn-primary text-sm">
              Create
            </button>
            <button
              onClick={() => {
                setCreatingBoard(false);
                setNewBoardName("");
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-16 rounded-full" />
                  <div className="skeleton h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid size={24} className="text-brand-500" />
            </div>
            <h3 className="font-semibold mb-2">No boards yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Create your first board to start managing tasks with AI.
            </p>
            <button
              onClick={() => setCreatingBoard(true)}
              className="btn-primary mx-auto"
            >
              <Plus size={14} /> Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board, i) => (
              <motion.div
                key={board._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/board/${board._id}`}
                  className="card p-5 block hover:border-brand-500/40 hover:shadow-task-hover transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{board.emoji || "📋"}</span>
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-brand-500 transition-colors">
                          {board.name}
                        </h3>
                        {board.description && (
                          <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">
                            {board.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-[var(--color-text-subtle)] group-hover:text-brand-500 transition-colors mt-0.5"
                    />
                  </div>

                  {/* Column pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {(board.columns || []).slice(0, 4).map((col) => (
                      <span
                        key={col.id}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: col.color + "20",
                          color: col.color,
                        }}
                      >
                        {col.title}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-subtle)]">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(board.updatedAt), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className="flex -space-x-1.5">
                      {(board.members || []).slice(0, 3).map((m) => (
                        <div
                          key={m.user?._id || m._id}
                          className="w-5 h-5 rounded-full bg-brand-500 border-2 border-[var(--color-surface)] flex items-center justify-center text-white text-[9px] font-medium"
                          title={m.user?.name}
                        >
                          {m.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
