import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { InputBox } from "@/components/InputBox";
import { Inbox, Sun, Moon } from "lucide-react";
import "./App.css";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Inbox className="size-4" />
            <span className="text-sm font-medium">Inbox</span>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="mx-auto w-full max-w-3xl flex-1 p-6">
          <h1 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Start with your vision
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Generate videos directly or enhance your prompt with AI assistance
          </p>

          <InputBox />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
