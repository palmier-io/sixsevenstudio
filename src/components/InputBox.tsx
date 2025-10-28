import { useEffect, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Image as ImageIcon, X, Send } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { VideoSettingsButton, type VideoSettings } from "./VideoSettings"
import { RESOLUTIONS_BY_MODEL, DEFAULT_VIDEO_SETTINGS, DEFAULT_LLM_MODEL, type LLMModel } from "@/types/constants"
import { ModelSelect } from "./ModelSelect"

type InputMode = "storyboard" | "video"

type InputBoxProps = {
  onGenerate?: (params: { prompt: string; settings: VideoSettings }) => void
  onStoryboard?: (params: { prompt: string; settings: VideoSettings; llmModel: LLMModel }) => void
  onImageSelect?: (file: File) => void
  onImageClear?: () => void
  onSettingsChange?: (settings: VideoSettings) => void
  disabled?: boolean
}

export function InputBox({ onGenerate, onStoryboard, onImageSelect, onImageClear, onSettingsChange, disabled }: InputBoxProps) {
  const [mode, setMode] = useState<InputMode>("video")
  const [value, setValue] = useState("")
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS)
  const [llmModel, setLLMModel] = useState<LLMModel>(DEFAULT_LLM_MODEL)

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

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const url = URL.createObjectURL(file)
          setImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          onImageSelect?.(file)
        }
        break
      }
    }
  }

  const placeholderText = mode === "storyboard"
    ? "Describe the story, characters, settings"
    : "Describe your video scene..."

  const handleSend = () => {
    if (mode === "storyboard") {
      onStoryboard?.({ prompt: value, settings, llmModel })
    } else {
      onGenerate?.({ prompt: value, settings })
    }
  }

  return (
    <Tabs value={mode} onValueChange={(value) => setMode(value as InputMode)} className="mx-auto mt-6">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Tab Switcher */}
        <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b gap-0">
          <TabsTrigger
            value="storyboard"
            className="flex-1 rounded-none data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=inactive]:!bg-muted data-[state=inactive]:!text-muted-foreground hover:data-[state=inactive]:!bg-muted/80 data-[state=active]:shadow-none px-4 py-3 border-0"
          >
            Storyboard
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="flex-1 rounded-none data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=inactive]:!bg-muted data-[state=inactive]:!text-muted-foreground hover:data-[state=inactive]:!bg-muted/80 data-[state=active]:shadow-none px-4 py-3 border-0"
          >
            Quick Video
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            onPaste={handlePaste}
            placeholder={placeholderText}
            className="min-h-24 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <div className="flex items-center gap-1.5">
            {mode === "video" && (
              <>
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
              </>
            )}
            {mode === "storyboard" && (
              <ModelSelect value={llmModel} onValueChange={setLLMModel} size="default" className="w-[120px]" />
            )}
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
              size="icon"
              onClick={handleSend}
              disabled={!value.trim() || disabled}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Tabs>
  )
}


