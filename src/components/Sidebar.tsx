import { Home } from "lucide-react"
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

export function Sidebar() {
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
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-2" isActive>
                  <Home className="size-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </UISidebar>
  )
}


