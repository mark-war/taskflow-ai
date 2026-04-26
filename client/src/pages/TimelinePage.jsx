// TimelinePage.jsx
import { useParams } from "react-router-dom";
import { GanttChartSquare } from "lucide-react";

export default function TimelinePage() {
  const { boardId } = useParams();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
        <GanttChartSquare size={28} className="text-purple-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Timeline / Gantt View</h2>
      <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
        Sprint planning with dependency lines and date ranges. Coming in the
        next build sprint!
      </p>
      <p className="text-xs text-[var(--color-text-subtle)] mt-3">
        Board ID: {boardId}
      </p>
    </div>
  );
}
