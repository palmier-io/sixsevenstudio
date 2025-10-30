import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';
import { ModelSelect } from '@/components/ModelSelect';
import type { LLMModel } from '@/types/constants';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
  llmModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
}

export function ChatInput({ onSend, onStop, disabled = false, status = 'ready', llmModel, onModelChange }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || status !== 'ready';
  const isProcessing = status === 'submitted' || status === 'streaming';

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isDisabled) return;

    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div className="flex-shrink-0 border-t px-4 pt-4 bg-background">
      <div className="flex gap-2 mb-1.5">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isProcessing ? 'AI is responding...' : 'Ask me anything...'}
          disabled={isDisabled}
          className="min-h-[60px] max-h-[150px] resize-none"
          rows={1}
        />
        {isProcessing ? (
          <Button
            onClick={onStop}
            disabled={!onStop}
            size="icon"
            className="shrink-0"
            variant="destructive"
            title="Stop"
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isDisabled || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center">
        <ModelSelect value={llmModel} onValueChange={onModelChange} size="compact" />
      </div>
    </div>
  );
}
