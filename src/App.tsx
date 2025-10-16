import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ApiKey } from "@/components/ApiKey";
import { Toaster } from "@/components/ui/sonner";
import { Sun, Moon } from "lucide-react";
import "./App.css";
import type { ProjectSummary } from "@/hooks/tauri/use-projects";
import { Home } from "@/pages/Home";
import { ProjectPage } from "@/pages/ProjectPage";
import StoryboardPage from "@/pages/StoryboardPage";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
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
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between border-b px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {location.pathname === "/" ? (
                  <BreadcrumbPage>Home</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {location.pathname === "/storyboard" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Storyboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {selectedProject && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedProject.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <ApiKey />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        {/* Routes */}
        <div className="flex-1 overflow-hidden min-h-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:projectName" element={<ProjectPage />} />
            <Route path="/storyboard" element={<StoryboardPage />} />
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
