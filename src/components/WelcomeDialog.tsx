import { useState } from "react";
import { useApiKey } from "@/hooks/tauri/use-api-key";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedCat } from "@/components/AnimatedCat";
import { toast } from "sonner";

interface WelcomeDialogProps {
  open: boolean;
}

export function WelcomeDialog({ open }: WelcomeDialogProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { saveApiKey } = useApiKey();

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsLoading(true);
    try {
      await saveApiKey(apiKeyInput);
      toast.success("API key saved successfully");
    } catch (error) {
      toast.error("Failed to save API key", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
            <AnimatedCat className="text-xs text-foreground leading-tight" animate={open} />
            <DialogTitle className="text-lg">Welcome to sixsevenstudio!</DialogTitle>
          </div>
          <DialogDescription className="text-sm pt-2 text-center">
            To get started, please enter your OpenAI API key, which is only stored on your device. Happy creating!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium">
              OpenAI API Key
            </label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Don't have an API key? Get one from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || !apiKeyInput.trim()}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
