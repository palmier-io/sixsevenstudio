import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useAiChat } from '@/hooks/use-ai-chat';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_LLM_MODEL, type LLMModel } from '@/types/constants';

interface ChatPanelProps {
  projectName: string;
  initialPrompt?: string;
  initialLLMModel?: LLMModel;
}

export function ChatPanel({ projectName, initialPrompt, initialLLMModel }: ChatPanelProps) {
  const [llmModel, setLLMModel] = useState<LLMModel>(initialLLMModel || DEFAULT_LLM_MODEL);
  const { messages, sendMessage, status, isLoadingKey, setMessages, hasApiKey, stop } = useAiChat(projectName, llmModel);
  const initialPromptSentRef = useRef(false);

  // Auto-send initial prompt
  useEffect(() => {
    if (
      initialPrompt &&
      !initialPromptSentRef.current &&
      messages.length === 0 &&
      hasApiKey &&
      status === 'ready'
    ) {
      initialPromptSentRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, messages.length, hasApiKey, status, sendMessage]);

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  const handleNewChat = () => {
    if (status !== 'ready' && stop) {
      stop();
    }
    setMessages([]);
  };

  if (isLoadingKey) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <Card className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            disabled={messages.length === 0 && status === 'ready'}
            title="New Chat"
          >
            <PlusCircle className="size-4" />
          </Button>
        </div>
      </div>

      <ChatMessages messages={messages} status={status} />
      <ChatInput onSend={handleSend} onStop={stop} status={status} llmModel={llmModel} onModelChange={setLLMModel} />
      </Card>
    </div>
  );
}
