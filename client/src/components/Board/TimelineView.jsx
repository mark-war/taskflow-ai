import { useState, useMemo, useRef } from "react";
import { useTaskStore, useBoardStore } from "@/store/index";
import { tasksAPI } from "@/services/api";
import {
  addDays,
  startOfWeek,
  format,
  differenceInDays,
  isToday,
  isWeekend,
  startOfDay,
  isSameDay,
} from "date-fns";
import TaskModal from "@/components/Task/TaskModal";
import clsx from "clsx";
import toast from "react-hot-toast";

const DAY_WIDTH = 40; // px per day cell
const ROW_HEIGHT = 40; // px per task row
const LABEL_WIDTH = 240; // px for left label column
const VISIBLE_DAYS = 60; // days to show

const PRIORITY_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const STATUS_OPACITY = {
  done: "opacity-60",
  backlog: "opacity-50",
  in_progress: "opacity-100",
  in_review: "opacity-90",
  todo: "opacity-80",
  blocked: "opacity-100",
};

export default function TimelineView({ filters = {} }) {
  const { tasks, updateTask } = useTaskStore();
  const { currentBoard } = useBoardStore();

  const [startDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null); // { taskId, startX, origStart, origEnd }
  const containerRef = useRef(null);

  // Days array
  const days = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate && !t.startDate) return false; // only show tasks with dates
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.type && t.type !== filters.type) return false;
      return true;
    });
  }, [tasks, filters]);

  // All tasks (including ones without dates) for the left label
  const allFiltered = useMemo(() => {
    return tasks.filter((t) => {
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.type && t.type !== filters.type) return false;
      return true;
    });
  }, [tasks, filters]);

  // Calculate bar position and width for a task
  const getBarStyle = (task) => {
    const start = task.startDate
      ? new Date(task.startDate)
      : new Date(task.dueDate);
    const end = task.dueDate ? new Date(task.dueDate) : start;

    const dayOffset = differenceInDays(
      startOfDay(start),
      startOfDay(startDate),
    );
    const duration = Math.max(
      1,
      differenceInDays(startOfDay(end), startOfDay(start)) + 1,
    );

    return {
      left: dayOffset * DAY_WIDTH,
      width: duration * DAY_WIDTH - 4,
    };
  };

  // Today marker offset
  const todayOffset = differenceInDays(
    startOfDay(new Date()),
    startOfDay(startDate),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Info bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 text-xs text-[var(--color-text-muted)]">
        <span>{filtered.length} tasks with dates</span>
        <span>·</span>
        <span>
          {allFiltered.length - filtered.length} tasks without dates (shown in
          list only)
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-brand-500" /> In Progress
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-emerald-500" /> Done
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-red-500" /> Blocked
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div
          className="flex"
          style={{ minWidth: LABEL_WIDTH + VISIBLE_DAYS * DAY_WIDTH }}
        >
          {/* Left: task labels */}
          <div
            className="flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] sticky left-0 z-20"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header spacer */}
            <div className="h-12 border-b border-[var(--color-border)] flex items-end px-3 pb-1.5">
              <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide">
                Task
              </span>
            </div>

            {allFiltered.map((task) => {
              const col = currentBoard?.columns?.find(
                (c) => c.id === task.column,
              );
              return (
                <div
                  key={task._id}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => setSelected(task._id)}
                  className="flex items-center gap-2 px-3 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors group"
                >
                  {col && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  <span className="text-xs truncate flex-1 group-hover:text-brand-500 transition-colors">
                    {task.title}
                  </span>
                  <div className="flex -space-x-1 flex-shrink-0">
                    {(task.assignees || []).slice(0, 2).map((a) => (
                      <div
                        key={a._id || a}
                        title={a.name}
                        className="w-5 h-5 rounded-full bg-brand-500 border border-[var(--color-surface)] flex items-center justify-center text-white text-[8px] font-bold"
                      >
                        {a.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Gantt grid */}
          <div className="flex-1 relative">
            {/* Day headers */}
            <div className="flex h-12 border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-surface)]">
              {days.map((day, i) => {
                const isMonday = day.getDay() === 1;
                const weekend = isWeekend(day);
                const todayDay = isToday(day);
                return (
                  <div
                    key={i}
                    style={{ width: DAY_WIDTH, flexShrink: 0 }}
                    className={clsx(
                      "flex flex-col items-center justify-end pb-1 border-r text-[10px] border-[var(--color-border)]",
                      weekend && "bg-[var(--color-bg)]",
                      todayDay && "bg-brand-500/10",
                    )}
                  >
                    {isMonday && (
                      <span className="text-[9px] text-[var(--color-text-subtle)] font-medium">
                        {format(day, "MMM")}
                      </span>
                    )}
                    <span
                      className={clsx(
                        "font-medium",
                        todayDay
                          ? "text-brand-500"
                          : weekend
                            ? "text-[var(--color-text-subtle)]"
                            : "text-[var(--color-text-muted)]",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="relative">
              {allFiltered.map((task, rowIdx) => {
                const hasDate = task.dueDate || task.startDate;
                const barStyle = hasDate ? getBarStyle(task) : null;
                const color = PRIORITY_COLORS[task.priority] || "#6366f1";
                const statusClass = STATUS_OPACITY[task.status] || "";
                const isBlocked = task.status === "blocked";
                const isDone = task.status === "done";

                return (
                  <div
                    key={task._id}
                    style={{ height: ROW_HEIGHT }}
                    className="relative flex border-b border-[var(--color-border)]"
                  >
                    {/* Background cells */}
                    {days.map((day, i) => (
                      <div
                        key={i}
                        style={{ width: DAY_WIDTH, flexShrink: 0 }}
                        className={clsx(
                          "h-full border-r border-[var(--color-border)]",
                          isWeekend(day) && "bg-[var(--color-bg)]",
                          isToday(day) && "bg-brand-500/5",
                        )}
                      />
                    ))}

                    {/* Task bar */}
                    {barStyle &&
                      barStyle.left >= 0 &&
                      barStyle.left < VISIBLE_DAYS * DAY_WIDTH && (
                        <div
                          style={{
                            position: "absolute",
                            left: barStyle.left + 2,
                            width: barStyle.width,
                            top: 8,
                            height: ROW_HEIGHT - 16,
                            backgroundColor: isDone
                              ? "#10b981"
                              : isBlocked
                                ? "#ef4444"
                                : color,
                          }}
                          className={clsx(
                            "rounded-md cursor-pointer flex items-center px-2 overflow-hidden",
                            "hover:brightness-110 transition-all shadow-sm",
                            statusClass,
                          )}
                          onClick={() => setSelected(task._id)}
                          title={`${task.title} — ${task.priority} priority`}
                        >
                          <span className="text-white text-[11px] font-medium truncate">
                            {task.title}
                          </span>
                        </div>
                      )}
                  </div>
                );
              })}

              {/* Today vertical line */}
              {todayOffset >= 0 && todayOffset < VISIBLE_DAYS && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-500 z-10 pointer-events-none"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                >
                  <div className="w-2 h-2 rounded-full bg-brand-500 -ml-[3px] -mt-1" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {allFiltered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-subtle)]">
            <p className="text-sm">No tasks match the current filters</p>
          </div>
        )}
      </div>

      {selected && (
        <TaskModal taskId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
