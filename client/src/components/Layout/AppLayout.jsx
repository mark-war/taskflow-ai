import { Outlet } from "react-router-dom";
import { useUIStore } from "@/store/index";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AICommandBar from "@/components/AI/AICommandBar";
import { useEffect } from "react";
import { getSocket } from "@/services/socket";

export default function AppLayout() {
  const { sidebarOpen, aiBarOpen } = useUIStore();

  // Initialize socket on mount
  useEffect(() => {
    getSocket();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Sidebar */}
      <div
        className={`
        flex-shrink-0 transition-all duration-200 ease-in-out
        ${sidebarOpen ? "w-60" : "w-14"}
      `}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>

      {/* AI Command Bar — global overlay */}
      {aiBarOpen && <AICommandBar />}
    </div>
  );
}
