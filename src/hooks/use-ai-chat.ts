import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { useApiKey } from '@/hooks/tauri/use-api-key';
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SYSTEM_PROMPT, MODEL, createStoryboardTools } from '@/lib/ai-sdk';
import { debug } from '@tauri-apps/plugin-log';

export function useAiChat(projectName: string) {
  const { apiKey, isLoading: isLoadingKey } = useApiKey();
  const queryClient = useQueryClient();

  // Helper to invalidate storyboard queries after modifications
  const invalidateStoryboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['storyboard', projectName] });
  }, [queryClient, projectName]);

  // Create custom transport with OpenAI streaming
  const transport = useMemo(() => {
    if (!apiKey) return null;

    const openai = createOpenAI({ apiKey });

    const customFetch = async (
      _input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      try {
        const body = JSON.parse(init?.body as string);

        const result = await streamText({
          model: openai(MODEL),
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(body.messages),
          abortSignal: init?.signal as AbortSignal | undefined,
          stopWhen: ({ steps }) => steps.length >= 10,
          onStepFinish: (step) => {
            debug(`[AI Agent Step]
              Step finish reason: ${step.finishReason}
              Tool call count: ${step.toolCalls?.length || 0}
              Tool result count: ${step.toolResults?.length || 0}
              Tokens used: ${step.usage?.totalTokens || 0}
              Text generated: ${step.text ? `${step.text.substring(0, 50)}...` : '(no text)'}
            `);
          },
          tools: createStoryboardTools(projectName, invalidateStoryboard),
        });

        return result.toUIMessageStreamResponse();
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };

    return new DefaultChatTransport({
      fetch: customFetch,
    });
  }, [apiKey, projectName, invalidateStoryboard]);

  const chat = useChat({
    id: projectName, // Unique chat per project
    transport: transport || undefined,
  });

  return {
    ...chat,
    hasApiKey: !!apiKey && !isLoadingKey,
    isLoadingKey,
  };
}
