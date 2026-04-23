import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Plus, MoreHorizontal, Dot } from "lucide-react";
import TaskCard from "../../components/Task/TaskCard";
import { tasksAPI } from "../../services/api";
import { useTaskStore } from "../../store";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const STATUS_COLORS = {
  backlog: "#94a3b8",
  todo: "#6366f1",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  blocked: "#ef4444",
  done: "#10b981",
};

export default function BoardColumn({ column, tasks, boardId, onTaskClick }) {
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { addTask } = useTaskStore();
  const { user } = useAuthStore();

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const { data } = await tasksAPI.create({
        title: newTitle.trim(),
        board: boardId,
        column: column.id,
        status: column.id,
        position: tasks.length,
      });
      addTask(data.task);
      setNewTitle("");
      setAddingTask(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  const color = column.color || STATUS_COLORS[column.id] || "#6366f1";
  const wipExceeded = column.wipLimit && tasks.length > column.wipLimit;

  return (
    <div
      className={clsx(
        "flex-shrink-0 w-72 flex flex-col rounded-xl border transition-all duration-150",
        isOver
          ? "border-brand-500/50 bg-brand-500/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
      style={{ maxHeight: "calc(100vh - 140px)" }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)]">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-sm flex-1 truncate">
          {column.title}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Task count / WIP limit */}
          <span
            className={clsx(
              "text-xs px-1.5 py-0.5 rounded-full font-medium",
              wipExceeded
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-[var(--color-bg)] text-[var(--color-text-muted)]",
            )}
          >
            {tasks.length}
            {column.wipLimit ? `/${column.wipLimit}` : ""}
          </span>
          <button
            onClick={() => setAddingTask(true)}
            className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
          >
            <Plus size={13} />
          </button>
          <button className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] transition-colors">
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* WIP warning */}
      {wipExceeded && (
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs border-b border-red-100 dark:border-red-900/30">
          ⚠️ WIP limit exceeded ({tasks.length}/{column.wipLimit})
        </div>
      )}

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]"
      >
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !addingTask && (
          <div
            className="flex items-center justify-center h-16 text-xs text-[var(--color-text-subtle)] rounded-lg border-2 border-dashed border-[var(--color-border)] cursor-pointer hover:border-brand-500/30 hover:text-brand-500/60 transition-colors"
            onClick={() => setAddingTask(true)}
          >
            Drop tasks here
          </div>
        )}
      </div>

      {/* Quick add task */}
      {addingTask && (
        <div className="p-2 border-t border-[var(--color-border)] space-y-2">
          <textarea
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
              if (e.key === "Escape") {
                setAddingTask(false);
                setNewTitle("");
              }
            }}
            placeholder="Task title… (Enter to add)"
            rows={2}
            className="input text-sm resize-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAddTask}
              className="btn-primary text-xs py-1 flex-1"
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setAddingTask(false);
                setNewTitle("");
              }}
              className="btn-secondary text-xs py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer add button */}
      {!addingTask && (
        <button
          onClick={() => setAddingTask(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors rounded-b-xl border-t border-[var(--color-border)]"
        >
          <Plus size={12} />
          Add task
        </button>
      )}
    </div>
  );
}
