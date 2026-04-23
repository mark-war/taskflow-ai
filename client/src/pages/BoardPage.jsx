import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useBoardStore, useTaskStore } from "../store";
import { boardsAPI, tasksAPI } from "../services/api";
import { joinBoard, leaveBoard } from "../services/socket";
import BoardColumn from "../components/Board/BoardColumn";
import TaskCard from "../components/Task/TaskCard";
import TaskModal from "../components/Task/TaskModal";
import BoardHeader from "../components/Board/BoardHeader";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function BoardPage() {
  const { boardId } = useParams();
  const { setCurrentBoard, currentBoard } = useBoardStore();
  const { tasks, setTasks, setLoading, loading, reorderTasks } = useTaskStore();

  const [activeTask, setActiveTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Load board + tasks
  useEffect(() => {
    if (!boardId) return;

    setLoading(true);
    Promise.all([boardsAPI.get(boardId), tasksAPI.list({ boardId })])
      .then(([boardRes, tasksRes]) => {
        setCurrentBoard(boardRes.data.board);
        setTasks(tasksRes.data.tasks);
      })
      .catch(() => {
        toast.error("Failed to load board");
      })
      .finally(() => setLoading(false));

    // Join socket room
    joinBoard(boardId);
    return () => leaveBoard(boardId);
  }, [boardId]);

  // ── DnD handlers ──────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeTask = tasks.find((t) => t._id === active.id);
    if (!activeTask) return;

    // Over a column
    const overIsColumn = currentBoard?.columns?.some((c) => c.id === over.id);
    if (overIsColumn && activeTask.column !== over.id) {
      reorderTasks(active.id, null, over.id);
    }
  };

  const handleDragEnd = useCallback(
    async ({ active, over }) => {
      setActiveTask(null);
      if (!over) return;

      const draggedTask = tasks.find((t) => t._id === active.id);
      if (!draggedTask) return;

      const overIsColumn = currentBoard?.columns?.some((c) => c.id === over.id);
      const targetColumn = overIsColumn
        ? over.id
        : tasks.find((t) => t._id === over.id)?.column;

      if (!targetColumn) return;

      // Reorder within store (optimistic)
      reorderTasks(active.id, over.id, targetColumn);

      // Compute new positions for persistence
      const columnTasks = tasks
        .filter((t) => t.column === targetColumn)
        .sort((a, b) => a.position - b.position);

      const updates = columnTasks.map((t, i) => ({
        id: t._id,
        column: targetColumn,
        position: i,
      }));

      try {
        await tasksAPI.reorder(updates);
      } catch {
        toast.error("Failed to save task order");
      }
    },
    [tasks, currentBoard],
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

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto board-scroll">
          <div
            className="flex gap-3 p-4 h-full min-h-0"
            style={{ minWidth: "max-content" }}
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

            {/* Add column button */}
            <AddColumnButton boardId={boardId} />
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.5" } },
            }),
          }}
        >
          {activeTask && (
            <div className="rotate-1 opacity-95">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task detail modal */}
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
      id: name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
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
    } catch {
      toast.error("Failed to add column");
    }
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex-shrink-0 w-72 h-10 flex items-center gap-2 px-3 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-brand-500/40 hover:text-brand-500 transition-all duration-150 text-sm mt-0.5"
      >
        <Plus size={15} />
        Add column
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 h-fit space-y-2 mt-0.5">
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
