import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { convertFileSrc } from '@tauri-apps/api/core';

interface StartingFramePanelProps {
  projectName: string;
  onImageUpload: (base64Data: string) => Promise<string>;
  onImageDelete: () => Promise<void>;
  onImageLoad: () => Promise<string | null>;
}

export function StartingFramePanel({
  projectName,
  onImageUpload,
  onImageDelete,
  onImageLoad,
}: StartingFramePanelProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Shared function to process image files
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please select an image file' });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        try {
          if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviewUrl);
          }

          const imagePath = await onImageUpload(base64Data);
          setImagePreviewUrl(convertFileSrc(imagePath));
          toast.success('Image uploaded successfully');
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          toast.error('Failed to upload image', { description: errMsg });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to process image', { description: errMsg });
    }
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleClearImage = async () => {
    if (imagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      await onImageDelete();
      toast.success('Image removed');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to delete image:', errMsg);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items?.length) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files?.length) {
      await processImageFile(files[0]);
    }
  };

  // Load image from metadata on mount
  useEffect(() => {
    const loadImage = async () => {
      const imagePath = await onImageLoad();
      if (imagePath) {
        setImagePreviewUrl(convertFileSrc(imagePath));
      }
    };
    loadImage();
  }, [projectName, onImageLoad]);

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageUpload]);

  return (
    <Card className="flex flex-col h-full">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-medium">Starting frame</h2>
          {imagePreviewUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearImage}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div
          className="flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <AspectRatio ratio={1 / 1} className="bg-muted rounded-lg overflow-hidden w-full relative">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Starting frame"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Button variant="outline" onClick={handlePickImage} className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Upload Image
                </Button>
                <p className="text-sm text-muted-foreground">
                  or drag and drop, or paste an image
                </p>
              </div>
            )}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center backdrop-blur-sm">
                <div className="text-primary font-medium">Drop image here</div>
              </div>
            )}
          </AspectRatio>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </Card>
  );
}
