import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  AlertCircle,
  CheckSquare,
  GripVertical,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const PRIORITY_CONFIG = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", label: "🔴" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", label: "🟠" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", label: "🟡" },
  low: { color: "text-green-500", bg: "bg-green-500/10", label: "🟢" },
};

const TYPE_CONFIG = {
  bug: { icon: "🐛", color: "text-red-500" },
  story: { icon: "📖", color: "text-blue-500" },
  epic: { icon: "⚡", color: "text-purple-500" },
  milestone: { icon: "🏆", color: "text-amber-500" },
  task: { icon: "✓", color: "text-[var(--color-text-muted)]" },
};

function dueDateLabel(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", urgent: true };
  if (isTomorrow(d)) return { label: "Tomorrow", urgent: false };
  if (isPast(d)) return { label: format(d, "MMM d"), overdue: true };
  return { label: format(d, "MMM d"), urgent: false };
}

export default function TaskCard({ task, onClick, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const type = TYPE_CONFIG[task.type] || TYPE_CONFIG.task;
  const due = dueDateLabel(task.dueDate);
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskTotal = task.subtasks?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={clsx(
        "group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3",
        "cursor-pointer select-none shadow-task transition-all duration-150",
        "hover:shadow-task-hover hover:border-brand-500/30",
        (isDragging || isSortableDragging) && "opacity-40 rotate-1",
      )}
    >
      {/* Drag handle + type + priority row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[var(--color-text-subtle)] -ml-1 transition-opacity"
          >
            <GripVertical size={12} />
          </div>
          <span className="text-xs" title={task.type}>
            {type.icon}
          </span>
          <span className="text-[10px] text-[var(--color-text-subtle)] font-mono uppercase tracking-wide">
            {task.type}
          </span>
        </div>
        {/* Priority indicator */}
        <span title={`Priority: ${task.priority}`} className="text-xs">
          {priority.label}
        </span>
      </div>

      {/* Title */}
      <h3
        className={clsx(
          "text-sm font-medium leading-snug mb-2.5",
          task.status === "done" &&
            "line-through text-[var(--color-text-muted)]",
        )}
      >
        {task.title}
      </h3>

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* AI summary snippet */}
      {task.aiSummary && (
        <div className="flex items-start gap-1.5 mb-2.5 bg-brand-500/5 rounded-lg px-2 py-1.5">
          <Zap size={10} className="text-brand-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
            {task.aiSummary}
          </p>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-1">
        {/* Left: due date, metadata */}
        <div className="flex items-center gap-2">
          {due && (
            <div
              className={clsx(
                "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                due.overdue
                  ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  : due.urgent
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-[var(--color-bg)] text-[var(--color-text-muted)]",
              )}
            >
              <Calendar size={9} />
              {due.label}
              {due.overdue && " ⚠"}
            </div>
          )}

          {subtaskTotal > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <CheckSquare size={9} />
              {subtaskDone}/{subtaskTotal}
            </div>
          )}

          {task.comments?.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <MessageSquare size={9} />
              {task.comments.length}
            </div>
          )}

          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <Paperclip size={9} />
              {task.attachments.length}
            </div>
          )}
        </div>

        {/* Right: assignee avatars */}
        <div className="flex -space-x-1.5">
          {(task.assignees || []).slice(0, 3).map((a) => (
            <div
              key={a._id || a}
              title={a.name}
              className="w-5 h-5 rounded-full bg-brand-500 border-2 border-[var(--color-surface)] flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0"
            >
              {a.name?.[0]?.toUpperCase() || "?"}
            </div>
          ))}
        </div>
      </div>

      {/* Subtask progress bar */}
      {subtaskTotal > 0 && (
        <div className="mt-2.5 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${(subtaskDone / subtaskTotal) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
