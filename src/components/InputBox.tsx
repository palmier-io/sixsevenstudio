import { useEffect, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { VideoSettingsButton, type VideoSettings, RESOLUTIONS_BY_MODEL } from "./VideoSettings"
import { DEFAULT_VIDEO_SETTINGS } from "@/types/constants"

type InputBoxProps = {
  onGenerate?: (params: { prompt: string; settings: VideoSettings }) => void
  onStoryboard?: (params: { prompt: string; settings: VideoSettings }) => void
  onImageSelect?: (file: File) => void
  onImageClear?: () => void
  onSettingsChange?: (settings: VideoSettings) => void
  disabled?: boolean
}

export function InputBox({ onGenerate, onStoryboard, onImageSelect, onImageClear, onSettingsChange, disabled }: InputBoxProps) {
  const [value, setValue] = useState("")
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS)

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
          <VideoSettingsButton
            settings={settings}
            onSettingsChange={setSettings}
          />
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
          <Button
            variant="secondary"
            onClick={() => onStoryboard?.({ prompt: value, settings })}
            disabled={!value.trim() || disabled}
            className="gap-2"
          >
            Storyboard
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


