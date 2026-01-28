import { useEffect, useRef, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { TypingIndicator } from "./TypingIndicator"
import { ToolApprovalRequest } from "./ToolApprovalRequest"
import { ToolExecutionResult } from "./ToolExecutionResult"
import { ErrorAlert } from "@/components/ui/ErrorAlert"
import { useTextChat } from "@/hooks/useTextChat"
import type { Message } from "@/lib/api"

interface TextChatInterfaceProps {
  conversationId: string
}

export function TextChatInterface({ conversationId }: TextChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    pendingApproval,
    toolResults,
    sendMessage,
    approveToolExecution,
    rejectToolExecution,
    retry,
  } = useTextChat({ conversationId })

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, streamingContent, scrollToBottom])

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] md:h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-muted-foreground" role="status" aria-live="polite">
          로딩 중...
        </div>
      </div>
    )
  }

  const streamingMessage: Message | null =
    isStreaming && streamingContent
      ? {
          id: "streaming",
          conversationId,
          sender: "AGENT",
          inputType: "text",
          content: streamingContent,
          createdAt: new Date().toISOString(),
        }
      : null

  return (
    <div className="flex h-[100dvh] md:h-[calc(100vh-64px)] flex-col">
      {error && (
        <div className="shrink-0 p-4 pb-0">
          <ErrorAlert error={error} onRetry={retry} />
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-2">
        <div
          ref={scrollRef}
          className="space-y-4 pb-4"
          role="log"
          aria-label="채팅 메시지"
          aria-live="polite"
        >
          {messages.length === 0 && !isStreaming ? (
            <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
              대화를 시작해보세요
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {streamingMessage && (
                <MessageBubble
                  key="streaming"
                  message={streamingMessage}
                  isStreaming
                />
              )}

              {toolResults.map((result, index) => (
                <ToolExecutionResult key={`tool-result-${index}`} result={result} />
              ))}

              {pendingApproval && (
                <ToolApprovalRequest
                  approval={pendingApproval}
                  onApprove={approveToolExecution}
                  onReject={rejectToolExecution}
                  isProcessing={isStreaming}
                />
              )}
            </>
          )}
          {isStreaming && !streamingContent && !pendingApproval && <TypingIndicator />}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border bg-background safe-area-inset-bottom">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          isLoading={isStreaming}
          className="border-t-0"
        />
      </div>
    </div>
  )
}
