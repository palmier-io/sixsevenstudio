import { useEffect, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, Settings2, Sparkles, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"


// CONSTANTS
export const SORA_MODELS = ["sora-2", "sora-2-pro"] as const
export type Model = typeof SORA_MODELS[number]
export const RESOLUTIONS_BY_MODEL: Record<
  Model,
  ReadonlyArray<{ value: string; isLandscape: boolean }>
> = {
  "sora-2": [
    { value: "1280x720", isLandscape: true },
    { value: "720x1280", isLandscape: false },
  ],
  "sora-2-pro": [
    { value: "1280x720", isLandscape: true },
    { value: "720x1280", isLandscape: false },
    { value: "1792x1024", isLandscape: true },
    { value: "1024x1792", isLandscape: false },
  ],
}
export const DURATIONS = [4, 8, 12] as const

function calculateCost(s: { model: Model; duration: number; samples: number; resolution: string }) {
  const isHighRes = s.resolution === "1792x1024" || s.resolution === "1024x1792"
  let rate = s.model === "sora-2" ? 0.1 : 0.3
  if (s.model === "sora-2-pro" && isHighRes) {
    rate = 0.5
  }
  return rate * s.duration * s.samples
}

type InputBoxProps = {
  onGenerate?: (params: { prompt: string; settings: Settings }) => void
  onImageSelect?: (file: File) => void
  onImageClear?: () => void
  onSettingsChange?: (settings: Settings) => void
  disabled?: boolean
}

type Settings = {
  model: Model
  resolution: string
  duration: number
  samples: number
}

export function InputBox({ onGenerate, onImageSelect, onImageClear, onSettingsChange, disabled }: InputBoxProps) {
  const [value, setValue] = useState("")
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<Settings>({
    model: "sora-2",
    resolution: "1280x720",
    duration: 4,
    samples: 1,
  })

  function AspectRatioIcon({ isLandscape }: { isLandscape: boolean }) {
    return (
      <div
        className={
          "border-2 border-current " + (isLandscape ? "w-6 h-4" : "w-4 h-6")
        }
      />
    )
  }

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  // Ensure resolution remains valid when switching model
  useEffect(() => {
    const allowed = RESOLUTIONS_BY_MODEL[settings.model].map((r) => r.value)
    if (!allowed.includes(settings.resolution)) {
      setSettings((s) => ({ ...s, resolution: "1280x720" }))
    }
  }, [settings.model])

  function handlePickImage() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    onImageSelect?.(file)
  }

  function handleClearImage() {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
    onImageClear?.()
  }

  return (
    <div className="mx-auto mt-6 rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="p-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="Describe your video... (e.g., 'A serene sunset over the ocean with waves gently crashing')"
          className="min-h-24 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Upload image" onClick={handlePickImage}>
                  <ImageIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add image</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Settings">
                <Settings2 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="start">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(v) => setSettings((s) => ({ ...s, model: v as Model }))}
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
                    onValueChange={(v) => setSettings((s) => ({ ...s, resolution: v }))}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Duration</Label>
                    <Select
                      value={String(settings.duration)}
                      onValueChange={(v) => setSettings((s) => ({ ...s, duration: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>{d} seconds</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Samples</Label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={settings.samples}
                      onChange={(e) => setSettings((s) => ({ ...s, samples: Number(e.target.value) }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1 text-xs">
                  <span className="text-muted-foreground">Estimated cost</span>
                  <span className="font-medium">${calculateCost({
                    model: settings.model,
                    duration: settings.duration,
                    samples: settings.samples,
                    resolution: settings.resolution,
                  }).toFixed(2)}</span>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {imagePreviewUrl ? (
            <div className="relative">
              <img
                src={imagePreviewUrl}
                alt="Selected"
                className="size-8 rounded-md object-cover ring-1 ring-border"
              />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-background text-foreground ring-1 ring-border hover:bg-accent"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Enhance">
            <Sparkles className="size-4" />
          </Button>
          <Button
            onClick={() => onGenerate?.({ prompt: value, settings })}
            disabled={!value.trim() || disabled}
          >
            Generate
          </Button>
        </div>
      </div>
    </div>
  )
}


