import { useEffect, useRef, useCallback, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageBubble } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { fetchMessages, sendTextMessage, type Message } from "@/lib/api"

interface TextChatInterfaceProps {
  conversationId: string
}

export function TextChatInterface({ conversationId }: TextChatInterfaceProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 5000,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendTextMessage({ conversationId, content }),
    onMutate: async (content) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] })

      const previousMessages = queryClient.getQueryData<Message[]>(["messages", conversationId])

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        sender: "USER",
        inputType: "text",
        content,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => [...old, optimisticMessage])

      return { previousMessages }
    },
    onError: (err, _content, context) => {
      setError(err instanceof Error ? err.message : "메시지 전송에 실패했습니다")
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", conversationId], context.previousMessages)
      }
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => {
        const filtered = old.filter((m) => !m.id.startsWith("temp-"))
        return [...filtered, newMessage]
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    },
  })

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sendMutation.isPending, scrollToBottom])

  const handleSend = useCallback(
    (content: string) => {
      sendMutation.mutate(content)
    },
    [sendMutation]
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
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
              대화를 시작해보세요
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {sendMutation.isPending && <TypingIndicator />}
        </div>
      </ScrollArea>

      <MessageInput onSend={handleSend} disabled={sendMutation.isPending} />
    </div>
  )
}
