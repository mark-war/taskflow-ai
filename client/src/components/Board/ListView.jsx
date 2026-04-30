import { useState, useMemo } from "react";
import { useTaskStore, useBoardStore } from "@/store/index";
import { tasksAPI } from "@/services/api";
import { format, isPast } from "date-fns";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Calendar,
  Flag,
  User,
  Tag,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react";
import TaskModal from "@/components/Task/TaskModal";
import clsx from "clsx";
import toast from "react-hot-toast";

const PRIORITY_STYLES = {
  critical: "text-red-500   bg-red-50   dark:bg-red-900/20",
  high: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  low: "text-green-500  bg-green-50  dark:bg-green-900/20",
};

const STATUS_ICONS = {
  backlog: <Circle size={14} className="text-slate-400" />,
  todo: <Circle size={14} className="text-brand-500" />,
  in_progress: <Clock size={14} className="text-amber-500" />,
  in_review: <AlertCircle size={14} className="text-purple-500" />,
  blocked: <AlertCircle size={14} className="text-red-500" />,
  done: <CheckCircle2 size={14} className="text-emerald-500" />,
};

const COLUMNS_DEF = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    width: "flex-1 min-w-[240px]",
  },
  { key: "status", label: "Status", sortable: true, width: "w-32" },
  { key: "priority", label: "Priority", sortable: true, width: "w-28" },
  { key: "type", label: "Type", sortable: true, width: "w-24" },
  { key: "assignees", label: "Assignee", sortable: false, width: "w-28" },
  { key: "dueDate", label: "Due", sortable: true, width: "w-28" },
  { key: "column", label: "Column", sortable: true, width: "w-28" },
];

export default function ListView({ filters = {} }) {
  const { tasks, updateTask } = useTaskStore();
  const { currentBoard } = useBoardStore();

  const [sortKey, setSortKey] = useState("position");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(null);
  const [groupBy, setGroupBy] = useState("none"); // none | column | priority | status

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Apply filters + sort
  const filtered = useMemo(() => {
    let result = [...tasks];

    if (filters.search)
      result = result.filter((t) =>
        t.title.toLowerCase().includes(filters.search.toLowerCase()),
      );
    if (filters.priority)
      result = result.filter((t) => t.priority === filters.priority);
    if (filters.type) result = result.filter((t) => t.type === filters.type);

    result.sort((a, b) => {
      let av = a[sortKey] ?? "";
      let bv = b[sortKey] ?? "";
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (sortKey === "priority") {
        av = priorityOrder[av] ?? 9;
        bv = priorityOrder[bv] ?? 9;
      }
      if (sortKey === "dueDate") {
        av = av ? new Date(av).getTime() : Infinity;
        bv = bv ? new Date(bv).getTime() : Infinity;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filters, sortKey, sortDir]);

  // Group tasks
  const grouped = useMemo(() => {
    if (groupBy === "none")
      return [{ key: "all", label: null, tasks: filtered }];
    const groups = {};
    filtered.forEach((t) => {
      const gKey = t[groupBy] || "none";
      if (!groups[gKey]) groups[gKey] = [];
      groups[gKey].push(t);
    });
    return Object.entries(groups).map(([key, tasks]) => ({
      key,
      label: key.replace("_", " "),
      tasks,
    }));
  }, [filtered, groupBy]);

  const handleStatusToggle = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const newColumn = task.status === "done" ? "todo" : "done";
    try {
      const { data } = await tasksAPI.update(task._id, {
        status: newStatus,
        column: newColumn,
      });
      updateTask(task._id, data.task);
    } catch {
      toast.error("Failed to update");
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp size={11} className="opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp size={11} className="text-brand-500" />
    ) : (
      <ChevronDown size={11} className="text-brand-500" />
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
        <span className="text-xs text-[var(--color-text-muted)]">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-[var(--color-text-subtle)]">
            Group by:
          </span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="input text-xs h-7 pr-6 appearance-none cursor-pointer w-28"
          >
            <option value="none">None</option>
            <option value="column">Column</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="w-8 px-2" />
              {COLUMNS_DEF.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    "text-left px-3 py-2.5 text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide whitespace-nowrap",
                    col.sortable &&
                      "cursor-pointer hover:text-[var(--color-text)] select-none",
                    col.width,
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} />}
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>

          <tbody>
            {grouped.map((group) => (
              <>
                {/* Group header */}
                {group.label && (
                  <tr
                    key={`group-${group.key}`}
                    className="bg-[var(--color-bg)]"
                  >
                    <td colSpan={COLUMNS_DEF.length + 2} className="px-4 py-2">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)] capitalize tracking-wider">
                        {group.label} ({group.tasks.length})
                      </span>
                    </td>
                  </tr>
                )}

                {/* Task rows */}
                {group.tasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    isPast(new Date(task.dueDate)) &&
                    task.status !== "done";
                  const col = currentBoard?.columns?.find(
                    (c) => c.id === task.column,
                  );

                  return (
                    <tr
                      key={task._id}
                      onClick={() => setSelected(task._id)}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer group transition-colors"
                    >
                      {/* Checkbox */}
                      <td
                        className="px-2 py-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusToggle(task);
                        }}
                      >
                        <button className="text-[var(--color-text-subtle)] hover:text-emerald-500 transition-colors">
                          {STATUS_ICONS[task.status] || <Circle size={14} />}
                        </button>
                      </td>

                      {/* Title */}
                      <td className="px-3 py-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              task.status === "done" &&
                                "line-through text-[var(--color-text-muted)]",
                            )}
                          >
                            {task.title}
                          </span>
                          {task.subtasks?.length > 0 && (
                            <span className="text-[10px] text-[var(--color-text-subtle)]">
                              {task.subtasks.filter((s) => s.completed).length}/
                              {task.subtasks.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 text-xs capitalize">
                          {STATUS_ICONS[task.status]}
                          <span className="text-[var(--color-text-muted)]">
                            {task.status?.replace("_", " ")}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "badge text-xs capitalize",
                            PRIORITY_STYLES[task.priority],
                          )}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2">
                        <span className="text-xs text-[var(--color-text-muted)] capitalize">
                          {task.type}
                        </span>
                      </td>

                      {/* Assignees */}
                      <td className="px-3 py-2">
                        <div className="flex -space-x-1.5">
                          {(task.assignees || []).slice(0, 3).map((a) => (
                            <div
                              key={a._id || a}
                              title={a.name}
                              className="w-6 h-6 rounded-full bg-brand-500 border-2 border-[var(--color-surface)] flex items-center justify-center text-white text-[9px] font-bold"
                            >
                              {a.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          ))}
                          {!task.assignees?.length && (
                            <span className="text-xs text-[var(--color-text-subtle)]">
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Due date */}
                      <td className="px-3 py-2">
                        {task.dueDate ? (
                          <span
                            className={clsx(
                              "text-xs",
                              isOverdue
                                ? "text-red-500 font-medium"
                                : "text-[var(--color-text-muted)]",
                            )}
                          >
                            {isOverdue && "⚠ "}
                            {format(new Date(task.dueDate), "MMM d")}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-subtle)]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Column */}
                      <td className="px-3 py-2">
                        {col && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: col.color }}
                            />
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {col.title}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-border)] transition-all"
                        >
                          <MoreHorizontal
                            size={13}
                            className="text-[var(--color-text-subtle)]"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS_DEF.length + 2}
                  className="text-center py-16 text-[var(--color-text-subtle)] text-sm"
                >
                  No tasks match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <TaskModal taskId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
