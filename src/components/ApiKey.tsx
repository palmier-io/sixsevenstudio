import { useState, useEffect } from "react";
import { useApiKey } from "@/hooks/tauri/use-api-key";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Key, Trash2, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";

export function ApiKey() {
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { saveApiKey, getApiKey, removeApiKey } = useApiKey();

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const key = await getApiKey();
      if (key) {
        setApiKey(key);
        setHasApiKey(true);
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsLoading(true);
    try {
      await saveApiKey(apiKey);
      setHasApiKey(true);
      toast.success("API key saved successfully");
    } catch (error) {
      toast.error("Failed to save API key", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await removeApiKey();
      setApiKey("");
      setHasApiKey(false);
      toast.success("API key deleted successfully");
    } catch (error) {
      toast.error("Failed to delete API key", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="OpenAI API Key">
          <div className="relative">
            <Key className={hasApiKey ? "size-4" : "size-4 text-muted-foreground"} />
            {!hasApiKey && (
              <AlertCircle className="absolute -bottom-0.5 -right-0.5 size-2.5 text-destructive" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3">
          <div className="mb-2 text-sm font-semibold">OpenAI API Key</div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-9 flex-1"
            />
            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="sm"
              className="h-9 px-3"
            >
              <Save className="size-4" />
            </Button>
            {hasApiKey && (
              <Button
                onClick={handleDelete}
                disabled={isLoading}
                size="sm"
                variant="destructive"
                className="h-9 px-3"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Your API key is stored securely on your device.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

