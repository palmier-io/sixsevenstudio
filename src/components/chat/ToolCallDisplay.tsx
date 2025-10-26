import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallDisplayProps {
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  output?: any;
  errorText?: string;
}

export function ToolCallDisplay({ toolName, state, output, errorText }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSuccess = state === 'output-available';
  const isError = state === 'output-error';
  const isLoading = state === 'input-streaming' || state === 'input-available';

  return (
    <div className="text-sm">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 hover:opacity-80 transition-opacity',
          (isSuccess || isError) && 'cursor-pointer',
          isLoading && 'cursor-default'
        )}
        disabled={isLoading}
      >
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
          {toolName} {isSuccess && 'succeeded'}
          {isError && 'failed'}
          {isLoading && 'executing...'}
        </span>

        {/* Expand/Collapse Icon */}
        {(isSuccess || isError) && (
          <div>
            {isExpanded ? (
              <ChevronDown className="size-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="mt-2 ml-6">
          {isSuccess && output && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Result:</div>
              <pre className="font-mono text-xs bg-muted/50 rounded px-2 py-2 overflow-x-auto">
                {typeof output === 'string'
                  ? output
                  : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}

          {isError && errorText && (
            <div className="text-xs text-red-600 dark:text-red-400">
              Error: {errorText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
