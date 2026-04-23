import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useUIStore, useTaskStore } from "../../store/index";
import { aiAPI } from "../../services/api";
import { useParams } from "react-router-dom";
import { emitAICommand } from "../../services/socket";
import toast from "react-hot-toast";
import clsx from "clsx";

const SUGGESTIONS = [
  "Move all blocked tasks to backlog",
  "Create a bug task assigned to me due Friday",
  "Show me everything assigned to Sarah this week",
  "Generate standup notes for today",
  "Set all overdue tasks to critical priority",
  'Create sprint "Q2 Alpha" with 2 week duration starting Monday',
  "What tasks are blocking the most work right now?",
  "Archive all done tasks older than 7 days",
];

export default function AICommandBar() {
  const { setAIBarOpen } = useUIStore();
  const { boardId } = useParams();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);

    // Close on Escape
    const handler = (e) => {
      if (e.key === "Escape") setAIBarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ⌘K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAIBarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const scrollToBottom = () => {
    setTimeout(
      () =>
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        }),
      50,
    );
  };

  const handleSubmit = useCallback(
    async (command = input.trim()) => {
      if (!command || loading) return;

      const userMessage = { role: "user", content: command, ts: Date.now() };
      setHistory((h) => [...h, userMessage]);
      setInput("");
      setLoading(true);
      setResult(null);
      scrollToBottom();

      if (boardId) emitAICommand(boardId, command);

      try {
        const { data } = await aiAPI.command(command, boardId);
        const aiMessage = {
          role: "ai",
          content: data.text,
          actions: data.actions,
          ts: Date.now(),
        };
        setHistory((h) => [...h, aiMessage]);
        setResult(data);
        scrollToBottom();

        // Show success toast for actions
        const actionCount = data.actions?.length || 0;
        if (actionCount > 0) {
          toast.success(
            `AI completed ${actionCount} action${actionCount > 1 ? "s" : ""}`,
            {
              icon: "✨",
            },
          );
        }
      } catch (err) {
        const errMessage = {
          role: "error",
          content:
            err.response?.data?.error || "Something went wrong. Try again.",
          ts: Date.now(),
        };
        setHistory((h) => [...h, errMessage]);
        scrollToBottom();
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [input, loading, boardId],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[12vh]"
        onClick={(e) => e.target === e.currentTarget && setAIBarOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl mx-4 bg-[var(--color-surface)] rounded-2xl shadow-modal border border-[var(--color-border)] overflow-hidden flex flex-col"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">TaskFlow AI</p>
              <p className="text-[11px] text-[var(--color-text-subtle)]">
                {boardId
                  ? "Commands apply to current board"
                  : "No board selected — open a board first"}
              </p>
            </div>
            <button
              onClick={() => setAIBarOpen(false)}
              className="btn-ghost p-1.5"
            >
              <X size={15} />
            </button>
          </div>

          {/* Conversation history */}
          {history.length > 0 && (
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
            >
              {history.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={clsx(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role !== "user" && (
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        msg.role === "error"
                          ? "bg-red-100"
                          : "bg-gradient-to-br from-brand-500 to-purple-500",
                      )}
                    >
                      {msg.role === "error" ? (
                        <AlertCircle size={13} className="text-red-500" />
                      ) : (
                        <Sparkles size={13} className="text-white" />
                      )}
                    </div>
                  )}
                  <div
                    className={clsx(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-brand-500 text-white rounded-tr-sm"
                        : msg.role === "error"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-tl-sm"
                          : "bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-sm",
                    )}
                  >
                    {msg.content && (
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}

                    {/* Action results */}
                    {msg.actions?.map((action, ai) => (
                      <ActionResult key={ai} action={action} />
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 items-center"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
                    <Loader2 size={13} className="text-white animate-spin" />
                  </div>
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl rounded-tl-sm px-3.5 py-2.5">
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Suggestions (only when no history) */}
          {history.length === 0 && (
            <div className="p-4 grid grid-cols-2 gap-2">
              {SUGGESTIONS.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s)}
                  className="text-left px-3 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-brand-500/40 hover:bg-brand-500/5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all duration-150 group"
                >
                  <div className="flex items-start gap-2">
                    <ChevronRight
                      size={12}
                      className="mt-0.5 flex-shrink-0 text-brand-500/50 group-hover:text-brand-500 transition-colors"
                    />
                    <span>{s}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            <div
              className={clsx(
                "flex items-end gap-2 rounded-xl border bg-[var(--color-surface)] px-3 py-2 transition-all duration-150",
                input
                  ? "border-brand-500/50 ai-glow"
                  : "border-[var(--color-border)]",
              )}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  boardId
                    ? "Tell AI what to do with your board… (Enter to send)"
                    : "Open a board first to use AI commands"
                }
                disabled={!boardId || loading}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none leading-relaxed"
                style={{
                  minHeight: "24px",
                  maxHeight: "96px",
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 96) + "px";
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || !boardId || loading}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {loading ? (
                  <Loader2 size={13} className="text-white animate-spin" />
                ) : (
                  <Send size={13} className="text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-[var(--color-text-subtle)] text-center mt-2">
              Powered by Groq · llama-3.3-70b · Press Esc to close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionResult({ action }) {
  const labels = {
    create_task: (a) => `✅ Created task "${a.task?.title}"`,
    update_tasks: (a) =>
      `✅ Updated ${a.affected} task${a.affected !== 1 ? "s" : ""}`,
    move_tasks: (a) =>
      `✅ Moved ${a.affected} task${a.affected !== 1 ? "s" : ""}`,
    assign_tasks: (a) =>
      `✅ Assigned ${a.affected} task${a.affected !== 1 ? "s" : ""}`,
    create_sprint: (a) => `✅ Created sprint "${a.sprint?.name}"`,
    query_tasks: (a) =>
      `🔍 Found ${a.results?.length || 0} task${a.results?.length !== 1 ? "s" : ""}`,
    generate_standup: () => null, // rendered inline in text
    bulk_delete: (a) =>
      `🗑️ Deleted ${a.affected} task${a.affected !== 1 ? "s" : ""}`,
    bulk_delete_pending: (a) =>
      `⚠️ Found ${a.count} tasks to delete — say "yes, delete them" to confirm`,
  };

  const label = labels[action.action]?.(action);
  if (!label) return null;

  return (
    <div className="mt-2 text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
      <span>{label}</span>
    </div>
  );
}
