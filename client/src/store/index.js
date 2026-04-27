import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// Board Store
// ============================================================
export const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  loading: false,

  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),

  updateBoard: (id, updates) =>
    set((s) => ({
      boards: s.boards.map((b) => (b._id === id ? { ...b, ...updates } : b)),
      currentBoard:
        s.currentBoard?._id === id
          ? { ...s.currentBoard, ...updates }
          : s.currentBoard,
    })),

  addColumn: (column) =>
    set((s) => ({
      currentBoard: s.currentBoard
        ? {
            ...s.currentBoard,
            columns: [...(s.currentBoard.columns || []), column],
          }
        : s.currentBoard,
    })),

  setLoading: (v) => set({ loading: v }),
}));

// ============================================================
// Task Store
// ============================================================
export const useTaskStore = create((set, get) => ({
  tasks: [], // flat array, all tasks for current board
  loading: false,
  selectedTask: null,

  setTasks: (tasksOrUpdater) =>
    set((s) => ({
      tasks:
        typeof tasksOrUpdater === "function"
          ? tasksOrUpdater(s.tasks)
          : tasksOrUpdater,
    })),
  setLoading: (v) => set({ loading: v }),
  setSelectedTask: (task) => set({ selectedTask: task }),

  // Get tasks grouped by column
  getByColumn: (columnId) => get().tasks.filter((t) => t.column === columnId),

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, ...updates } : t)),
      selectedTask:
        s.selectedTask?._id === id
          ? { ...s.selectedTask, ...updates }
          : s.selectedTask,
    })),

  removeTask: (id) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t._id !== id),
      selectedTask: s.selectedTask?._id === id ? null : s.selectedTask,
    })),

  // Optimistic reorder for DnD
  reorderTasks: (activeId, overId, newColumn) =>
    set((s) => {
      const tasks = [...s.tasks];
      const activeIdx = tasks.findIndex((t) => t._id === activeId);
      const overIdx = tasks.findIndex((t) => t._id === overId);
      if (activeIdx === -1) return {};

      const updated = { ...tasks[activeIdx], column: newColumn };
      tasks.splice(activeIdx, 1);
      const insertAt = overIdx === -1 ? tasks.length : overIdx;
      tasks.splice(insertAt, 0, updated);

      // Recalculate positions within column
      let pos = 0;
      const final = tasks.map((t) => {
        if (t.column === newColumn) return { ...t, position: pos++ };
        return t;
      });

      return { tasks: final };
    }),

  bulkUpdate: (ids, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        ids.includes(t._id) ? { ...t, ...updates } : t,
      ),
    })),
}));

// ============================================================
// UI Store
// ============================================================
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  aiBarOpen: false,
  taskModalOpen: false,
  activeView: "kanban", // kanban | timeline | list | calendar

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setAIBarOpen: (v) => set({ aiBarOpen: v }),
  setTaskModalOpen: (v) => set({ taskModalOpen: v }),
  setActiveView: (v) => set({ activeView: v }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleAIBar: () => set((s) => ({ aiBarOpen: !s.aiBarOpen })),
}));

// ============================================================
// Theme Store
// ============================================================
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "taskflow-theme" },
  ),
);

// ============================================================
// Presence Store (real-time)
// ============================================================
export const usePresenceStore = create((set) => ({
  members: [], // [{ id, name, avatar, cursor }]
  setMembers: (members) => set({ members }),
  updateCursor: (userId, cursor) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === userId ? { ...m, cursor } : m)),
    })),
}));
