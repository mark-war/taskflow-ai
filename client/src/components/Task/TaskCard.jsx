import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  CheckSquare,
  GripVertical,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const PRIORITY_CONFIG = {
  critical: { label: "🔴", ring: "ring-red-400/40" },
  high: { label: "🟠", ring: "ring-orange-400/40" },
  medium: { label: "🟡", ring: "" },
  low: { label: "🟢", ring: "" },
};

const TYPE_CONFIG = {
  bug: "🐛",
  story: "📖",
  epic: "⚡",
  milestone: "🏆",
  task: "✓",
};

// Safely extract the icon whether the value is a string or legacy {icon, color} object
function getTypeIcon(type) {
  const val = TYPE_CONFIG[type] ?? TYPE_CONFIG.task;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val.icon) return val.icon;
  return "✓";
}

function dueDateLabel(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", urgent: true, overdue: false };
  if (isTomorrow(d))
    return { label: "Tomorrow", urgent: false, overdue: false };
  if (isPast(d))
    return { label: format(d, "MMM d"), urgent: false, overdue: true };
  return { label: format(d, "MMM d"), urgent: false, overdue: false };
}

export default function TaskCard({ task, onClick, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const typeIcon = getTypeIcon(task.type);
  const due = dueDateLabel(task.dueDate);
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskTotal = task.subtasks?.length || 0;

  const isBeingDragged = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={clsx(
        "group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3",
        "cursor-pointer select-none transition-all duration-150",
        "hover:border-brand-500/30 hover:shadow-task-hover",
        isBeingDragged && "opacity-30 ring-2 ring-brand-500/50",
        priority.ring && `hover:ring-1 ${priority.ring}`,
      )}
    >
      {/* Top row: drag handle + type + priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {/* Drag handle — separate activator so card click still works */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[var(--color-text-subtle)] -ml-1 p-0.5 rounded transition-opacity touch-none"
          >
            <GripVertical size={13} />
          </div>
          <span className="text-xs">{typeIcon}</span>
          <span className="text-[10px] text-[var(--color-text-subtle)] font-mono uppercase tracking-wide">
            {task.type}
          </span>
        </div>
        <span className="text-xs" title={`${task.priority} priority`}>
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

      {/* AI summary */}
      {task.aiSummary && (
        <div className="flex items-start gap-1.5 mb-2.5 bg-brand-500/5 rounded-lg px-2 py-1.5 border border-brand-500/10">
          <Zap size={10} className="text-brand-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
            {task.aiSummary}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Due date */}
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

          {/* Subtasks */}
          {subtaskTotal > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <CheckSquare size={9} />
              {subtaskDone}/{subtaskTotal}
            </div>
          )}

          {/* Comments */}
          {task.comments?.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <MessageSquare size={9} />
              {task.comments.length}
            </div>
          )}

          {/* Attachments */}
          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)]">
              <Paperclip size={9} />
              {task.attachments.length}
            </div>
          )}
        </div>

        {/* Assignee avatars */}
        <div className="flex -space-x-1.5 flex-shrink-0">
          {(task.assignees || []).slice(0, 3).map((a) => (
            <div
              key={a._id || a}
              title={a.name}
              className="w-5 h-5 rounded-full bg-brand-500 border-2 border-[var(--color-surface)] flex items-center justify-center text-white text-[9px] font-bold"
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
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(subtaskDone / subtaskTotal) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
