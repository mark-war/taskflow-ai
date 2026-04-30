import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBoardStore, useTaskStore } from "@/store/index";
import { boardsAPI, tasksAPI } from "@/services/api";
import { joinBoard, leaveBoard } from "@/services/socket";
import BoardHeader from "@/components/Board/BoardHeader";
import TimelineView from "@/components/Board/TimelineView";
import ListView from "@/components/Board/ListView";
import { useUIStore } from "@/store/index";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function TimelinePage() {
  const { boardId } = useParams();
  const { setCurrentBoard, currentBoard } = useBoardStore();
  const { setTasks, setLoading, loading } = useTaskStore();
  const { activeView } = useUIStore();
  const [filters, setFilters] = useState({
    search: "",
    priority: "",
    type: "",
  });

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

  if (loading && !currentBoard) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BoardHeader board={currentBoard} onFilterChange={setFilters} />
      {activeView === "list" ? (
        <ListView filters={filters} />
      ) : (
        <TimelineView filters={filters} />
      )}
    </div>
  );
}
