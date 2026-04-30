import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Pencil,
  Calendar,
  Users,
  Tag,
  Flag,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
  Clock,
} from "lucide-react";
import { tasksAPI, aiAPI, filesAPI } from "@/services/api";
import { useTaskStore, useBoardStore } from "@/store/index";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import clsx from "clsx";

const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];
// STATUS_OPTIONS now come from the board's columns dynamically (see component)
const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function TaskModal({ taskId, onClose }) {
  const { updateTask, removeTask } = useTaskStore();
  const { currentBoard } = useBoardStore();
  const { user } = useAuthStore();

  // Build status options dynamically from board columns so custom columns appear
  const statusOptions = currentBoard?.columns?.map((c) => ({
    value: c.id,
    label: c.title,
  })) || [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "blocked", label: "Blocked" },
    { value: "done", label: "Done" },
  ];
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [enriching, setEnriching] = useState(false);
  const fileRef = useRef(null);

  // Load full task
  useEffect(() => {
    tasksAPI
      .get(taskId)
      .then((r) => setTask(r.data.task))
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Listen for real-time updates to this task and update local state accordingly
  useEffect(() => {
    const storeTask = useTaskStore
      .getState()
      .tasks.find((t) => t.id === taskId || t._id === taskId);

    if (storeTask && task) {
      setTask((prevTask) => {
        // Only update if the status/column actually changed to avoid unnecessary re-renders
        if (
          prevTask.status === storeTask.status &&
          prevTask.column === storeTask.column
        ) {
          return prevTask;
        }
        return { ...prevTask, ...storeTask };
      });
    }
  }, [taskId, task?.status, task?.column]);

  // Close on Escape
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const save = async (updates) => {
    setSaving(true);
    try {
      const { data } = await tasksAPI.update(taskId, updates);
      setTask(data.task);
      updateTask(taskId, data.task);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      const { data } = await tasksAPI.addComment(taskId, comment);
      setTask((t) => ({
        ...t,
        comments: [...(t.comments || []), data.comment],
      }));
      setComment("");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const updated = [
      ...(task.subtasks || []),
      { title: newSubtask, completed: false },
    ];
    await save({ subtasks: updated });
    setNewSubtask("");
    setAddingSubtask(false);
  };

  const toggleSubtask = async (idx) => {
    const updated = task.subtasks.map((s, i) =>
      i === idx ? { ...s, completed: !s.completed } : s,
    );
    await save({ subtasks: updated });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await tasksAPI.delete(taskId);
      removeTask(taskId);
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const { data } = await aiAPI.enrich(taskId);
      setTask((t) => ({ ...t, ...data.task }));
      updateTask(taskId, data.task);
      toast.success("AI enrichment applied ✨");
    } catch {
      toast.error("AI enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const { data } = await filesAPI.upload(taskId, files);
      setTask((t) => ({
        ...t,
        attachments: [...(t.attachments || []), ...data.attachments],
      }));
      toast.success(`${files.length} file(s) attached`);
    } catch {
      toast.error("Upload failed");
    }
    e.target.value = "";
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full max-w-2xl h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col overflow-hidden"
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-brand-500" />
            </div>
          ) : !task ? (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
              Task not found
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span
                    className={clsx("badge", PRIORITY_COLORS[task.priority])}
                  >
                    {task.priority}
                  </span>
                  <span>·</span>
                  <span className="font-mono uppercase">{task.type}</span>
                  {saving && (
                    <span className="flex items-center gap-1 text-brand-500">
                      <Loader2 size={11} className="animate-spin" /> saving…
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="btn-ghost text-xs py-1 px-2 gap-1"
                  >
                    {enriching ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    AI Enrich
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-ghost text-xs py-1 px-2 gap-1 text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button onClick={onClose} className="btn-ghost p-2 ml-1">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <textarea
                      defaultValue={task.title}
                      onBlur={(e) => {
                        if (e.target.value !== task.title)
                          save({ title: e.target.value });
                      }}
                      className="w-full text-xl font-bold bg-transparent border-none outline-none resize-none leading-snug placeholder:text-[var(--color-text-subtle)] focus:ring-0 text-[var(--color-text)]"
                      rows={2}
                    />
                  </div>

                  {/* AI summary */}
                  {task.aiSummary && (
                    <div className="flex items-start gap-2.5 bg-brand-500/5 rounded-xl px-4 py-3 border border-brand-500/15">
                      <Sparkles
                        size={14}
                        className="text-brand-500 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                        {task.aiSummary}
                      </p>
                    </div>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">
                        Status
                      </label>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          save({
                            status: e.target.value,
                            column: e.target.value,
                          })
                        }
                        className="input text-sm"
                      >
                        {statusOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">
                        Priority
                      </label>
                      <select
                        value={task.priority}
                        onChange={(e) => save({ priority: e.target.value })}
                        className="input text-sm"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Due date */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={
                          task.dueDate
                            ? format(new Date(task.dueDate), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(e) =>
                          save({ dueDate: e.target.value || null })
                        }
                        className="input text-sm"
                      />
                    </div>

                    {/* Estimated hours */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">
                        Est. Hours
                        {task.aiEstimatedHours && (
                          <span className="ml-1 text-brand-500 font-normal normal-case">
                            (AI: {task.aiEstimatedHours}h)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={task.estimatedHours || ""}
                        onBlur={(e) =>
                          save({
                            estimatedHours: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="input text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">
                      Description
                    </label>
                    <textarea
                      defaultValue={task.description}
                      onBlur={(e) => {
                        if (e.target.value !== task.description)
                          save({ description: e.target.value });
                      }}
                      placeholder="Add a description…"
                      rows={4}
                      className="input text-sm resize-y"
                    />
                  </div>

                  {/* Subtasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide">
                        Subtasks
                        {task.subtasks?.length > 0 && (
                          <span className="ml-1.5 text-brand-500 font-normal normal-case">
                            {task.subtasks.filter((s) => s.completed).length}/
                            {task.subtasks.length}
                          </span>
                        )}
                      </label>
                      <button
                        onClick={() => setAddingSubtask(true)}
                        className="btn-ghost text-xs py-1 px-2 gap-1"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>

                    {task.subtasks?.length > 0 && (
                      <div className="mb-2 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                          style={{
                            width: `${(task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {task.subtasks?.map((s, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-2.5 group cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() => toggleSubtask(i)}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-brand-500 accent-brand-500"
                          />
                          <span
                            className={clsx(
                              "text-sm flex-1",
                              s.completed &&
                                "line-through text-[var(--color-text-subtle)]",
                            )}
                          >
                            {s.title}
                          </span>
                        </label>
                      ))}
                    </div>

                    {addingSubtask && (
                      <div className="mt-2 flex gap-2">
                        <input
                          autoFocus
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddSubtask();
                            if (e.key === "Escape") {
                              setAddingSubtask(false);
                              setNewSubtask("");
                            }
                          }}
                          placeholder="Subtask title…"
                          className="input text-sm flex-1"
                        />
                        <button
                          onClick={handleAddSubtask}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingSubtask(false)}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide">
                        Attachments{" "}
                        {task.attachments?.length > 0 &&
                          `(${task.attachments.length})`}
                      </label>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="btn-ghost text-xs py-1 px-2 gap-1"
                      >
                        <Paperclip size={12} /> Attach
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        hidden
                        onChange={handleFileUpload}
                      />
                    </div>
                    {task.attachments?.length > 0 && (
                      <div className="space-y-1.5">
                        {task.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--color-border)] hover:border-brand-500/40 hover:bg-[var(--color-bg)] transition-all text-sm group"
                          >
                            <Paperclip
                              size={13}
                              className="text-[var(--color-text-subtle)]"
                            />
                            <span className="flex-1 truncate text-xs">
                              {a.filename}
                            </span>
                            <ExternalLink
                              size={11}
                              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-subtle)] transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-3">
                      Comments{" "}
                      {task.comments?.length > 0 && `(${task.comments.length})`}
                    </label>

                    <div className="space-y-3 mb-3">
                      {task.comments?.map((c, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {c.author?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {c.author?.name || "Unknown"}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-subtle)]">
                                {c.createdAt
                                  ? format(
                                      new Date(c.createdAt),
                                      "MMM d, h:mm a",
                                    )
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-muted)]">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add comment */}
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                              handleComment();
                          }}
                          placeholder="Write a comment… (⌘Enter to send)"
                          rows={2}
                          className="input text-sm resize-none w-full mb-2"
                        />
                        <button
                          onClick={handleComment}
                          disabled={!comment.trim()}
                          className="btn-primary text-xs py-1.5"
                        >
                          <MessageSquare size={12} /> Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center gap-3 text-xs text-[var(--color-text-subtle)] flex-shrink-0">
                <Clock size={11} />
                Created{" "}
                {task.createdAt
                  ? format(new Date(task.createdAt), "MMM d, yyyy")
                  : "—"}
                {task.updatedAt &&
                  ` · Updated ${format(new Date(task.updatedAt), "MMM d")}`}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
