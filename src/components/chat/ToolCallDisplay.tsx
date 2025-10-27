import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallDisplayProps {
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  output?: any;
  errorText?: string;
}

export function ToolCallDisplay({ toolName, state, errorText }: ToolCallDisplayProps) {
  const isSuccess = state === 'output-available';
  const isError = state === 'output-error';
  const isLoading = state === 'input-streaming' || state === 'input-available';

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Status Icon */}
      {isSuccess && <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />}
      {isError && <XCircle className="size-4 text-red-600 dark:text-red-400" />}
      {isLoading && (
        <div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      )}

      {/* Tool Name and Status */}
      <span
        className={cn(
          'text-sm',
          isSuccess && 'text-green-600 dark:text-green-400',
          isError && 'text-red-600 dark:text-red-400',
          isLoading && 'text-muted-foreground'
        )}
      >
        {toolName}
        {isSuccess && ' ✓'}
        {isError && ` failed${errorText ? `: ${errorText}` : ''}`}
        {isLoading && ' executing...'}
      </span>
    </div>
  );
}
