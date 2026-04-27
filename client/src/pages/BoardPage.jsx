import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { useBoardStore, useTaskStore } from "@/store/index";
import { boardsAPI, tasksAPI } from "@/services/api";
import { joinBoard, leaveBoard } from "@/services/socket";
import BoardColumn from "@/components/Board/BoardColumn";
import TaskCard from "@/components/Task/TaskCard";
import TaskModal from "@/components/Task/TaskModal";
import BoardHeader from "@/components/Board/BoardHeader";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function BoardPage() {
  const { boardId } = useParams();
  const { setCurrentBoard, currentBoard, updateBoard } = useBoardStore();
  const { tasks, setTasks, setLoading, loading } = useTaskStore();

  const [activeTask, setActiveTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Stable ref so DnD callbacks never have stale task state
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Load board + tasks
  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    Promise.all([
      boardsAPI.get(boardId),
      tasksAPI.list({ boardId, limit: 500 }),
    ])
      .then(([boardRes, tasksRes]) => {
        setCurrentBoard(boardRes.data.board);
        setTasks(tasksRes.data.tasks);
      })
      .catch(() => toast.error("Failed to load board"))
      .finally(() => setLoading(false));

    joinBoard(boardId);
    return () => leaveBoard(boardId);
  }, [boardId]);

  // DnD drag start — snapshot the dragged task for overlay
  const handleDragStart = useCallback(({ active }) => {
    const task = tasksRef.current.find((t) => t._id === active.id);
    setActiveTask(task || null);
  }, []);

  // DnD drag over — optimistic reorder in store
  const handleDragOver = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return;

      const current = tasksRef.current;
      const draggedTask = current.find((t) => t._id === active.id);
      if (!draggedTask) return;

      const overIsColumn = currentBoard?.columns?.some((c) => c.id === over.id);
      const overTask = current.find((t) => t._id === over.id);
      const targetColumn = overIsColumn ? over.id : overTask?.column;
      if (!targetColumn) return;

      setTasks((prev) => {
        // Move task to new column
        let updated = prev.map((t) =>
          t._id === active.id ? { ...t, column: targetColumn } : t,
        );

        // If dropping over a task (not a column), reorder within list
        if (!overIsColumn && overTask) {
          const activeIdx = updated.findIndex((t) => t._id === active.id);
          const overIdx = updated.findIndex((t) => t._id === over.id);
          updated = arrayMove(updated, activeIdx, overIdx);
        }

        // Recalculate position indices per column
        const groups = {};
        updated.forEach((t) => {
          if (!groups[t.column]) groups[t.column] = [];
          groups[t.column].push(t._id);
        });

        return updated.map((t) => ({
          ...t,
          position: groups[t.column].indexOf(t._id),
        }));
      });
    },
    [currentBoard, setTasks],
  );

  // DnD drag end — persist final order to server
  const handleDragEnd = useCallback(
    async ({ active }) => {
      setActiveTask(null);

      const current = tasksRef.current;
      const movedTask = current.find((t) => t._id === active.id);
      if (!movedTask) return;

      // Send all tasks (server does bulk upsert on position+column)
      const updates = current.map((t) => ({
        id: t._id,
        column: t.column,
        position: t.position,
      }));

      try {
        await tasksAPI.reorder(updates);
      } catch {
        toast.error("Failed to save order — reloading");
        const res = await tasksAPI.list({ boardId, limit: 500 });
        setTasks(res.data.tasks);
      }
    },
    [boardId, setTasks],
  );

  const columns = currentBoard?.columns || [];

  if (loading && !currentBoard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Loading board…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BoardHeader board={currentBoard} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div
            className="flex gap-3 p-4"
            style={{
              minWidth: "max-content",
              minHeight: "calc(100vh - 112px)",
            }}
          >
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={tasks
                  .filter((t) => t.column === column.id)
                  .sort((a, b) => a.position - b.position)}
                boardId={boardId}
                onTaskClick={(task) => setSelectedTaskId(task._id)}
              />
            ))}
            <AddColumnButton boardId={boardId} />
          </div>
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.4" } },
            }),
          }}
        >
          {activeTask && (
            <div className="rotate-2 scale-105 shadow-modal opacity-95">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

function AddColumnButton({ boardId }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const { currentBoard, updateBoard } = useBoardStore();

  const handleAdd = async () => {
    if (!name.trim()) return;
    const column = {
      id: `col_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      title: name.trim(),
      color: "#6366f1",
      position: currentBoard?.columns?.length || 0,
    };
    try {
      const updated = [...(currentBoard?.columns || []), column];
      await boardsAPI.update(boardId, { columns: updated });
      updateBoard(boardId, { columns: updated });
      setName("");
      setAdding(false);
      toast.success(`Column "${column.title}" added`);
    } catch {
      toast.error("Failed to add column");
    }
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex-shrink-0 w-72 h-10 flex items-center gap-2 px-3 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-brand-500/40 hover:text-brand-500 transition-all duration-150 text-sm self-start"
      >
        <Plus size={15} />
        Add column
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 h-fit space-y-2 self-start">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setAdding(false);
        }}
        placeholder="Column name…"
        className="input text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="btn-primary text-xs py-1.5 flex-1"
        >
          Add
        </button>
        <button
          onClick={() => setAdding(false)}
          className="btn-secondary text-xs py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
