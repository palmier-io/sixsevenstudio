import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Settings2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SORA_MODELS, RESOLUTIONS_BY_MODEL, DURATIONS, Model } from "@/types/constants"

export type VideoSettings = {
  model: Model
  resolution: string
  duration: number
  samples: number
}

export function calculateCost(s: VideoSettings) {
  const isHighRes = s.resolution === "1792x1024" || s.resolution === "1024x1792"
  let rate = s.model === "sora-2" ? 0.1 : 0.3
  if (s.model === "sora-2-pro" && isHighRes) {
    rate = 0.5
  }
  return rate * s.duration * s.samples
}

function AspectRatioIcon({ isLandscape }: { isLandscape: boolean }) {
  return (
    <div
      className={
        "border-2 border-current " + (isLandscape ? "w-6 h-4" : "w-4 h-6")
      }
    />
  )
}

interface VideoSettingsFormProps {
  settings: VideoSettings
  onSettingsChange: (settings: VideoSettings) => void
  showSamples?: boolean
}

export function VideoSettingsForm({ settings, onSettingsChange, showSamples = true }: VideoSettingsFormProps) {
  const updateSettings = (updates: Partial<VideoSettings>) => {
    onSettingsChange({ ...settings, ...updates })
  }

  return (
    <div className="p-2 space-y-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">Model</Label>
        <Select
          value={settings.model}
          onValueChange={(v) => updateSettings({ model: v as Model })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORA_MODELS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Resolution</Label>
        <Select
          value={settings.resolution}
          onValueChange={(v) => updateSettings({ resolution: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS_BY_MODEL[settings.model].map((r) => (
              <SelectItem key={r.value} value={r.value}>
                <span className="flex items-center gap-2">
                  <AspectRatioIcon isLandscape={r.isLandscape} />
                  <span>{r.value}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={showSamples ? "grid grid-cols-2 gap-3" : "grid gap-1.5"}>
        <div className="grid gap-1.5">
          <Label className="text-xs">Duration</Label>
          <Select
            value={String(settings.duration)}
            onValueChange={(v) => updateSettings({ duration: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>{d}s</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showSamples && (
          <div className="grid gap-1.5">
            <Label className="text-xs">Samples</Label>
            <Input
              type="number"
              min={1}
              max={8}
              value={settings.samples}
              onChange={(e) => {
                const val = Math.max(1, Math.min(8, Number(e.target.value)))
                updateSettings({ samples: val })
              }}
            />
          </div>
        )}
      </div>
      <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Estimated cost: <span className="font-medium">${calculateCost(settings).toFixed(2)}</span>
      </div>
    </div>
  )
}

interface VideoSettingsButtonProps {
  settings: VideoSettings
  onSettingsChange: (settings: VideoSettings) => void
  variant?: "outline" | "ghost" | "default" | "secondary"
  size?: "icon-sm" | "icon" | "sm" | "default"
  showSamples?: boolean
  className?: string
}

export function VideoSettingsButton({
  settings,
  onSettingsChange,
  variant = "outline",
  size = "icon-sm",
  showSamples = true,
  className
}: VideoSettingsButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} aria-label="Settings" className={className}>
          <Settings2 className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="start">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <VideoSettingsForm
          settings={settings}
          onSettingsChange={onSettingsChange}
          showSamples={showSamples}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
