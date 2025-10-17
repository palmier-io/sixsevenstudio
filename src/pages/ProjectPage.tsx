import { useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, BookOpen } from "lucide-react";
import { VideosTab } from "@/components/tabs/VideosTab";
import { StoryboardTab } from "@/components/tabs/StoryboardTab";

export function ProjectPage() {
  const params = useParams<{ projectName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") || "videos") as "videos" | "storyboard";

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
      {/* Compact tabs with icons */}
      <div className="px-6 pt-4 pb-2 flex-shrink-0">
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
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "videos" && <VideosTab projectName={params.projectName} />}
        {activeTab === "storyboard" && <StoryboardTab projectName={params.projectName} />}
      </div>
    </div>
  );
}
