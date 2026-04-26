#!/usr/bin/env node
/**
 * Quick sanity check — run from project root:
 *   node check-files.js
 */
import { existsSync } from "fs";
import { join } from "path";

const required = [
  // Server
  "server/src/index.js",
  "server/src/config/db.js",
  "server/src/middleware/auth.js",
  "server/src/middleware/errorHandler.js",
  "server/src/models/Task.js",
  "server/src/models/Board.js",
  "server/src/models/index.js",
  "server/src/routes/auth.js",
  "server/src/routes/boards.js",
  "server/src/routes/tasks.js",
  "server/src/routes/users.js",
  "server/src/routes/teams.js",
  "server/src/routes/ai.js",
  "server/src/routes/files.js",
  "server/src/routes/activity.js",
  "server/src/services/aiService.js",
  "server/src/socket/index.js",
  "server/src/seed.js",
  "server/package.json",
  "server/.env.example",
  // Client
  "client/src/main.jsx",
  "client/src/App.jsx",
  "client/src/index.css",
  "client/src/store/authStore.js",
  "client/src/store/index.js",
  "client/src/store/themeStore.js",
  "client/src/services/api.js",
  "client/src/services/socket.js",
  "client/src/pages/LoginPage.jsx",
  "client/src/pages/RegisterPage.jsx",
  "client/src/pages/DashboardPage.jsx",
  "client/src/pages/BoardPage.jsx",
  "client/src/pages/TimelinePage.jsx",
  "client/src/pages/TeamPage.jsx",
  "client/src/pages/SettingsPage.jsx",
  "client/src/components/Layout/AppLayout.jsx",
  "client/src/components/Layout/Sidebar.jsx",
  "client/src/components/Layout/Topbar.jsx",
  "client/src/components/Board/BoardColumn.jsx",
  "client/src/components/Board/BoardHeader.jsx",
  "client/src/components/Task/TaskCard.jsx",
  "client/src/components/Task/TaskModal.jsx",
  "client/src/components/AI/AICommandBar.jsx",
  "client/package.json",
  "client/vite.config.js",
  "client/tailwind.config.js",
  "client/postcss.config.js",
  "client/index.html",
];

let ok = 0,
  missing = [];
required.forEach((f) => {
  if (existsSync(join(__dirname, f))) ok++;
  else missing.push(f);
});

console.log(`\n✅ ${ok}/${required.length} files present`);
if (missing.length) {
  console.log("❌ Missing:");
  missing.forEach((f) => console.log("   -", f));
} else {
  console.log("🎉 All files present — ready to run!\n");
}
