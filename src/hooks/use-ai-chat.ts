import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { useApiKey } from '@/hooks/tauri/use-api-key';
import { useMemo } from 'react';
import { z } from 'zod';

const SYSTEM_PROMPT = 'You are a helpful AI assistant for video editing and storyboarding. Help users with their creative projects, provide suggestions, and answer questions about video production. You have access to a test tool - use it when asked to test or say hello.';
const MODEL = 'gpt-4.1-mini';

export function useAiChat(projectName: string) {
  const { apiKey, isLoading: isLoadingKey } = useApiKey();

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
          tools: {
            testTool: {
              description: 'A test tool that prints "hello six seven"',
              inputSchema: z.object({}),
              execute: async () => {
                return 'hello six seven';
              },
            },
          },
        });

        return result.toUIMessageStreamResponse();
      } catch (error) {
        // Return error as a proper Response object
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
  }, [apiKey]);

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
