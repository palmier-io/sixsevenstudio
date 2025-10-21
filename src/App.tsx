import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";
import type { ProjectSummary } from "@/hooks/tauri/use-projects";
import { Home } from "@/pages/Home";
import { ProjectPage } from "@/pages/ProjectPage";

const queryClient = new QueryClient();

function AppLayout() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <SidebarProvider>
      <Sidebar
        selectedProject={selectedProject?.name ?? null}
        onSelectProject={(p) => setSelectedProject(p)}
        theme={theme}
        onThemeChange={setTheme}
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Routes */}
        <div className="flex-1 overflow-hidden min-h-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:projectName" element={<ProjectPage selectedProject={selectedProject} />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
