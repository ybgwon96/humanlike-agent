import { useEffect, useRef, useCallback, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageBubble } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { fetchMessages, streamTextMessage, type Message } from "@/lib/api"

interface TextChatInterfaceProps {
  conversationId: string
}

export function TextChatInterface({ conversationId }: TextChatInterfaceProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: isStreaming ? false : 5000,
  })

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, streamingContent, scrollToBottom])

  const handleSend = useCallback(
    async (content: string) => {
      setError(null)
      setIsStreaming(true)
      setStreamingContent("")

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        sender: "USER",
        inputType: "text",
        content,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => [
        ...old,
        optimisticMessage,
      ])

      await streamTextMessage(
        { conversationId, content },
        {
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk)
          },
          onComplete: () => {
            setIsStreaming(false)
            setStreamingContent("")

            queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => {
              const filtered = old.filter((m) => !m.id.startsWith("temp-"))
              return filtered
            })

            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
          },
          onError: (errorMessage) => {
            setError(errorMessage)
            setIsStreaming(false)
            setStreamingContent("")

            queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) =>
              old.filter((m) => !m.id.startsWith("temp-"))
            )
          },
          onUserMessageSaved: (messageId) => {
            queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => {
              return old.map((m) =>
                m.id.startsWith("temp-") ? { ...m, id: messageId } : m
              )
            })
          },
        }
      )
    },
    [conversationId, queryClient]
  )

  const handleRetry = useCallback(() => {
    setError(null)
    queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
  }, [queryClient, conversationId])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  const streamingMessage: Message | null = isStreaming && streamingContent
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
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {error && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3 w-3" />
              재시도
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4">
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
                <MessageBubble key="streaming" message={streamingMessage} isStreaming />
              )}
            </>
          )}
          {isStreaming && !streamingContent && <TypingIndicator />}
        </div>
      </ScrollArea>

      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
