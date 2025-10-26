import { cn } from '@/lib/utils';
import type { UIMessage } from '@ai-sdk/react';
import { ToolCallDisplay } from './ToolCallDisplay';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Separate text parts from tool parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const toolParts = message.parts.filter(part => part.type.startsWith('tool-'));

  return (
    <div className="mb-4 space-y-2">
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
    </div>
  );
}
