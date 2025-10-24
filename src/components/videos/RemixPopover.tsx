import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Sparkles } from "lucide-react";

interface RemixPopoverProps {
  onRemix: (remixPrompt: string) => void;
  buttonSize?: "sm" | "default" | "lg" | "icon";
  buttonClassName?: string;
  compact?: boolean;
}

export function RemixPopover({
  onRemix,
  buttonSize = "sm",
  buttonClassName = "w-fit",
  compact = false,
}: RemixPopoverProps) {
  const [remixPrompt, setRemixPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (remixPrompt.trim()) {
      onRemix(remixPrompt.trim());
      setRemixPrompt("");
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setRemixPrompt("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={buttonSize}
          className={buttonClassName}
          title="Remix video"
        >
          <Sparkles className={buttonSize === "icon" ? "size-4" : "size-3 mr-1.5"} />
          {buttonSize !== "icon" && "Remix"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Remix Video</h4>
            <p className="text-xs text-muted-foreground">
              {compact
                ? "Describe modifications"
                : "Describe how you'd like to modify this video"}
            </p>
          </div>
          <Textarea
            placeholder="e.g., Make the colors more vibrant, add a sunset in the background..."
            value={remixPrompt}
            onChange={(e) => setRemixPrompt(e.target.value)}
            rows={compact ? 3 : 4}
            className="text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={!remixPrompt.trim()}
            >
              {compact ? "Remix" : "Create Remix"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
