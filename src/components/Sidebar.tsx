import { Folder, MoreHorizontal, Trash2, Sun, Moon, ChevronRight } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useState } from "react"
import {
  Sidebar as UISidebar,
  SidebarRail,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useProjects, ProjectSummary } from "@/hooks/tauri/use-projects"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApiKey } from "@/components/ApiKey"
import { toast } from "sonner"
import { error as logError } from "@tauri-apps/plugin-log"

export function Sidebar({
  onSelectProject,
  theme,
  onThemeChange,
}: {
  selectedProject?: string | null
  onSelectProject?: (project: ProjectSummary) => void
  theme: "light" | "dark"
  onThemeChange: (theme: "light" | "dark") => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, deleteProject } = useProjects()
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true)

  const onDelete = async (name: string) => {
    try {
      await deleteProject(name, "trash")
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logError(`Failed to delete project: ${errMsg}`)
      toast.error("Failed to delete project", {
        description: errMsg,
      })
    }
  }

  return (
    <UISidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold leading-tight group-data-[collapsible=icon]:hidden">sixsevenstudio</span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
                <>
                  <div
                    className="mt-2 flex items-center gap-1.5 px-3 group-data-[collapsible=icon]:hidden cursor-pointer hover:bg-accent rounded-md py-1.5 transition-colors"
                    onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                  >
                    <div className="text-xs font-medium text-muted-foreground">Projects</div>
                    <ChevronRight
                      className={`size-3.5 text-muted-foreground transition-transform ${
                        isProjectsExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  {isProjectsExpanded && projects.map((p) => (
                    <SidebarMenuItem key={p.path}>
                      <SidebarMenuButton
                        className="gap-2 px-2 py-1.5 group"
                        isActive={location.pathname === `/projects/${p.name}`}
                        onClick={() => {
                          onSelectProject?.(p)
                          navigate(`/projects/${p.name}`, {
                            state: { project: p }
                          })
                        }}
                      >
                        <Folder className="size-4 shrink-0" />
                        <span className="truncate flex-1">{p.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Project actions"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              onDelete(p.name)
                            }}>
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="flex flex-col items-stretch gap-2">
          <ApiKey />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </UISidebar>
  )
}


