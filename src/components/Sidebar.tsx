import { Folder, MoreHorizontal, Trash2, Sun, Moon } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
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
} from "@/components/ui/sidebar"
import { useProjects, ProjectSummary } from "@/hooks/tauri/use-projects"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApiKey } from "@/components/ApiKey"

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

  const onDelete = async (name: string) => {
    try {
      await deleteProject(name, "trash")
    } catch (error) {
      console.error("Failed to delete project:", error)
      alert(`Failed to delete project: ${error}`)
    }
  }

  return (
    <UISidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center justify-center">
          <span className="text-sm font-semibold leading-tight group-data-[collapsible=icon]:hidden">sixsevenstudio</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
                <>
                  <div className="mt-2 flex items-center justify-between px-3 group-data-[collapsible=icon]:hidden">
                    <div className="text-xs font-medium text-muted-foreground">Projects</div>
                  </div>
                  {projects.map((p) => (
                    <SidebarMenuItem key={p.path}>
                      <SidebarMenuButton
                        className="gap-2"
                        isActive={location.pathname === `/projects/${p.name}`}
                        onClick={() => {
                          onSelectProject?.(p)
                          navigate(`/projects/${p.name}`, {
                            state: { project: p }
                          })
                        }}
                      >
                        <Folder className="size-4" />
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Project actions"
                              onClick={(e) => e.stopPropagation()}
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


