import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState, useRef, useEffect } from "react";
import { Plus, MoreHorizontal, Trash2, Edit2, Check, X } from "lucide-react";
import TaskCard from "@/components/Task/TaskCard";
import { tasksAPI, boardsAPI } from "@/services/api";
import { useTaskStore, useBoardStore } from "@/store/index";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const menuRef = useRef(null);
  const { addTask } = useTaskStore();
  const { currentBoard, updateBoard } = useBoardStore();

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Make the column itself a drop target (for dropping into empty columns)
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const { data } = await tasksAPI.create({
        title: newTitle.trim(),
        board: boardId,
        column: column.id,
        // status mirrors column id — backend will handle custom columns
        position: tasks.length,
        priority: "medium",
        type: "task",
      });
      addTask(data.task);
      setNewTitle("");
      setAddingTask(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create task");
    }
  };

  // ── Rename column ─────────────────────────────────────────
  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === column.title) {
      setRenaming(false);
      return;
    }
    try {
      const updated = (currentBoard?.columns || []).map((c) =>
        c.id === column.id ? { ...c, title: renameValue.trim() } : c,
      );
      await boardsAPI.update(boardId, { columns: updated });
      updateBoard(boardId, { columns: updated });
      setRenaming(false);
      toast.success("Column renamed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to rename column");
    }
  };

  // ── Delete column ─────────────────────────────────────────
  const handleDelete = async () => {
    if (
      !confirm(
        `Delete column "${column.title}"? Tasks inside will be moved to Backlog.`,
      )
    )
      return;
    setMenuOpen(false);
    try {
      // Move tasks to backlog first
      if (tasks.length > 0) {
        const ops = tasks.map((t) => ({
          id: t._id,
          column: "backlog",
          position: t.position,
        }));
        await tasksAPI.reorder(ops);
        // Update store
        tasks.forEach((t) => {
          useTaskStore
            .getState()
            .updateTask(t._id, { column: "backlog", status: "backlog" });
        });
      }
      // Remove column from board
      const updated = (currentBoard?.columns || []).filter(
        (c) => c.id !== column.id,
      );
      await boardsAPI.update(boardId, { columns: updated });
      updateBoard(boardId, { columns: updated });
      toast.success(`Column "${column.title}" deleted`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete column");
    }
  };

  const color = column.color || STATUS_COLORS[column.id] || "#6366f1";
  const wipExceeded = column.wipLimit && tasks.length > column.wipLimit;

  return (
    <div
      className={clsx(
        "flex-shrink-0 w-72 flex flex-col rounded-xl border transition-colors duration-150",
        isOver
          ? "border-brand-500/60 bg-brand-500/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
      style={{ maxHeight: "calc(100vh - 140px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Title / rename input */}
        {renaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setRenaming(false);
                  setRenameValue(column.title);
                }
              }}
              className="input text-sm py-0.5 h-6 flex-1"
            />
            <button
              onClick={handleRename}
              className="p-0.5 text-emerald-500 hover:text-emerald-600"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => {
                setRenaming(false);
                setRenameValue(column.title);
              }}
              className="p-0.5 text-[var(--color-text-subtle)]"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <span className="font-medium text-sm flex-1 truncate">
            {column.title}
          </span>
        )}

        {/* Count + actions */}
        {!renaming && (
          <div className="flex items-center gap-1">
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

            {/* Column menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] transition-colors"
              >
                <MoreHorizontal size={13} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-task-hover z-50 overflow-hidden py-1">
                  <button
                    onClick={() => {
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                  >
                    <Edit2
                      size={13}
                      className="text-[var(--color-text-subtle)]"
                    />
                    Rename column
                  </button>
                  <div className="h-px bg-[var(--color-border)] my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors text-left"
                  >
                    <Trash2 size={13} />
                    Delete column
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WIP warning */}
      {wipExceeded && (
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs border-b border-red-100 flex-shrink-0">
          ⚠️ WIP limit exceeded ({tasks.length}/{column.wipLimit})
        </div>
      )}

      {/* Task list */}
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

        {/* Empty state — also acts as drop hint */}
        {tasks.length === 0 && !addingTask && (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full flex items-center justify-center h-16 text-xs text-[var(--color-text-subtle)] rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-brand-500/40 hover:text-brand-500/70 transition-colors"
          >
            Drop tasks here or click to add
          </button>
        )}
      </div>

      {/* Quick add form */}
      {addingTask && (
        <div className="p-2 border-t border-[var(--color-border)] space-y-2 flex-shrink-0">
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
            className="input text-sm resize-none w-full"
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

      {/* Footer add */}
      {!addingTask && (
        <button
          onClick={() => setAddingTask(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors rounded-b-xl border-t border-[var(--color-border)] flex-shrink-0"
        >
          <Plus size={12} /> Add Task
        </button>
      )}
    </div>
  );
}
