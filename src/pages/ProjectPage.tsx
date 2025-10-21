import { useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, BookOpen, Scissors } from "lucide-react";
import { VideosTab } from "@/components/tabs/VideosTab";
import { StoryboardTab } from "@/components/tabs/StoryboardTab";
import { VideoEditorTab } from "@/components/tabs/VideoEditorTab";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { ProjectSummary } from "@/hooks/tauri/use-projects";

export function ProjectPage({ selectedProject }: { selectedProject: ProjectSummary | null }) {
  const params = useParams<{ projectName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") || "videos") as "videos" | "storyboard" | "editor";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (!params.projectName) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No project found</h3>
          <p className="text-sm text-muted-foreground">Please select a project from the sidebar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header with breadcrumb and tabs */}
      <div className="px-6 py-3 flex-shrink-0 flex items-center justify-between border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
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

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-fit h-7 p-[2px]">
            <TabsTrigger value="storyboard" className="text-xs h-full px-2 gap-1.5">
              <BookOpen className="size-3" />
              Storyboard
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs h-full px-2 gap-1.5">
              <Video className="size-3" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="editor" className="text-xs h-full px-2 gap-1.5">
              <Scissors className="size-3" />
              Editor
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "videos" && <VideosTab projectName={params.projectName} />}
        {activeTab === "storyboard" && <StoryboardTab projectName={params.projectName} />}
        {activeTab === "editor" && <VideoEditorTab projectName={params.projectName} />}
      </div>
    </div>
  );
}
