import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
}

export function ChatInput({ onSend, disabled = false, status = 'ready' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || status !== 'ready';
  const isStreaming = status === 'streaming';

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
    <div className="flex-shrink-0 border-t p-4 bg-background">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'AI is responding...' : 'Ask me anything...'}
          disabled={isDisabled}
          className="min-h-[60px] max-h-[150px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={isDisabled || !input.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
