import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UIMessage } from '@ai-sdk/react';
import { AnimatedCat } from '@/components/AnimatedCat';
import { cn } from '@/lib/utils';
import { ToolCallDisplay } from './ToolCallDisplay';

interface ChatMessageProps {
  message: UIMessage;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Separate text parts from tool parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const toolParts = message.parts.filter(part => part.type.startsWith('tool-'));

  return (
    <div className="mb-4 space-y-2">
      {/* Tool Calls */}
      {toolParts.map((part, index) => {
        const toolName = part.type.replace('tool-', '');
        const toolPart = part as any;

        return (
          <ToolCallDisplay
            key={`tool-${index}`}
            toolName={toolName}
            state={toolPart.state}
            output={toolPart.output}
            errorText={toolPart.errorText}
          />
        );
      })}

      {/* Text Messages */}
      {textParts.length > 0 && (
        <div
          className={cn(
            'flex',
            isUser ? 'justify-end' : 'justify-start'
          )}
        >
          {isUser ? (
            // User message
            <div className="max-w-[80%] rounded-lg px-4 py-2 shadow-sm bg-primary text-primary-foreground">
              <div className="text-sm">
                {textParts.map((part, index) => (
                  <p key={index} className="whitespace-pre-wrap break-words leading-relaxed">
                    {(part as any).text}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            // AI message
            <div className="text-sm text-foreground">
              {textParts.map((part, index) => (
                <p key={index} className="whitespace-pre-wrap break-words leading-relaxed">
                  {(part as any).text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChatMessagesProps {
  messages: UIMessage[];
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
}

export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === 'streaming';
  const isSubmitted = status === 'submitted';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isStreaming]);

  return (
    <ScrollArea className="flex-1 min-h-0 px-4">
      <div className="py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium mb-1">Start a conversation</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Ask me anything about your video project, storyboarding, or editing tips.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isSubmitted && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
                <AnimatedCat className="text-[8px] leading-tight" animate={true} />
                <span>thinking...</span>
              </div>
            )}
          </>
        )}
        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
