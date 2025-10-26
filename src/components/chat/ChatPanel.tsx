import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useAiChat } from '@/hooks/use-ai-chat';
import { Bot, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatPanelProps {
  projectName: string;
}

export function ChatPanel({ projectName }: ChatPanelProps) {
  const { messages, sendMessage, status, isLoadingKey, setMessages } = useAiChat(projectName);

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      if (confirm('Start a new chat? This will clear the current conversation.')) {
        setMessages([]);
      }
    }
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            disabled={messages.length === 0}
            title="New Chat"
          >
            <PlusCircle className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} status={status} />

      {/* Input */}
      <ChatInput onSend={handleSend} status={status} />
    </div>
  );
}
