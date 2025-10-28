import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { useApiKey } from '@/hooks/tauri/use-api-key';
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SYSTEM_PROMPT, createStoryboardTools } from '@/lib/ai-sdk';
import { debug } from '@tauri-apps/plugin-log';
import type { LLMModel } from '@/types/constants';

const MAX_STEPS_EACH_ROUND = 30;

export function useAiChat(projectName: string, model: LLMModel) {
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
          model: openai(model),
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(body.messages),
          abortSignal: init?.signal as AbortSignal | undefined,
          stopWhen: ({ steps }) => steps.length >= MAX_STEPS_EACH_ROUND,
          onStepFinish: (step) => {
            debug(`[AI Agent Step]
              Step finish reason: ${step.finishReason}
              Tool calls: ${step.toolCalls?.map(call => call.toolName + ' ' + JSON.stringify(call.input)).join(', ') || 'none'}
              Tool result count: ${step.toolResults?.length || 0}
              Tokens used: ${step.usage?.totalTokens || 0}
              Text generated: ${step.text ? `${step.text.substring(0, 50)}...` : '(no text)'}
            `);
          },
          tools: createStoryboardTools(projectName, invalidateStoryboard, apiKey),
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
  }, [apiKey, projectName, invalidateStoryboard, model]);

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
