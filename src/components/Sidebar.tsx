import { Folder, MoreHorizontal, Trash2 } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { useProjects, ProjectSummary } from "@/hooks/tauri/use-projects"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Sidebar({
  onSelectProject,
}: {
  selectedProject?: string | null
  onSelectProject?: (project: ProjectSummary) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    getWorkspaceDir,
    listProjects,
    deleteProject,
  } = useProjects()
  const [projects, setProjects] = useState<ProjectSummary[]>([])

  const reload = async () => {
    const ws = await getWorkspaceDir()
    if (ws) {
      const list = await listProjects()
      setProjects(list)
    } else {
      setProjects([])
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const onDelete = async (name: string) => {
    if (!confirm(`Move project "${name}" to Trash?`)) return
    try {
      await deleteProject(name, "trash")
      setProjects((prev) => prev.filter((p) => p.name !== name))
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
      <SidebarRail />
    </UISidebar>
  )
}


