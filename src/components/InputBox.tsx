import { useEffect, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, Settings2, Sparkles, X } from "lucide-react"

type InputBoxProps = {
  placeholder?: string
  onGenerate?: (value: string) => void
  onImageSelect?: (file: File) => void
  onImageClear?: () => void
}

export function InputBox({ placeholder, onGenerate, onImageSelect, onImageClear }: InputBoxProps) {
  const [value, setValue] = useState("")
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

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
          placeholder={
            placeholder ??
            "Describe your video... (e.g., 'A serene sunset over the ocean with waves gently crashing')"
          }
          className="min-h-24 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" aria-label="Upload image" onClick={handlePickImage}>
            <ImageIcon className="size-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Settings">
            <Settings2 className="size-4" />
          </Button>
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
          <Button onClick={() => onGenerate?.(value)}>Generate</Button>
        </div>
      </div>
    </div>
  )
}


