import { useState, useCallback, useRef, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchMessages,
  streamTextMessage,
  streamToolApproval,
  type Message,
  type StreamCallbacks,
  type ToolApprovalData,
  type ToolResultData,
} from "@/lib/api"

export interface UseTextChatOptions {
  conversationId: string
  refetchInterval?: number
}

export interface UseTextChatReturn {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  error: string | null
  pendingApproval: ToolApprovalData | null
  toolResults: ToolResultData[]
  sendMessage: (content: string) => Promise<void>
  approveToolExecution: (approvalId: string) => Promise<void>
  rejectToolExecution: (approvalId: string) => Promise<void>
  clearError: () => void
  retry: () => void
}

export function useTextChat({
  conversationId,
  refetchInterval = 5000,
}: UseTextChatOptions): UseTextChatReturn {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalData | null>(null)
  const [toolResults, setToolResults] = useState<ToolResultData[]>([])
  const abortRef = useRef(false)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: isStreaming ? false : refetchInterval,
  })

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const createCallbacks = useCallback((): StreamCallbacks => ({
    onChunk: (chunk) => {
      if (abortRef.current) return
      setStreamingContent((prev) => prev + chunk)
    },
    onComplete: () => {
      if (abortRef.current) return
      setIsStreaming(false)
      setStreamingContent("")

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) => old.filter((m) => !m.id.startsWith("temp-"))
      )

      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    },
    onError: (errorMessage) => {
      setError(errorMessage)
      setIsStreaming(false)
      setStreamingContent("")
      setPendingApproval(null)

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) => old.filter((m) => !m.id.startsWith("temp-"))
      )
    },
    onUserMessageSaved: (messageId) => {
      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) =>
          old.map((m) => (m.id.startsWith("temp-") ? { ...m, id: messageId } : m))
      )
    },
    onToolApproval: (approval) => {
      if (abortRef.current) return
      setPendingApproval(approval)
      setIsStreaming(false)
    },
    onToolResult: (result) => {
      if (abortRef.current) return
      setToolResults((prev) => [...prev, result])
    },
  }), [conversationId, queryClient])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      setError(null)
      setIsStreaming(true)
      setStreamingContent("")
      setToolResults([])
      abortRef.current = false

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        sender: "USER",
        inputType: "text",
        content,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) => [...old, optimisticMessage]
      )

      await streamTextMessage({ conversationId, content }, createCallbacks())
    },
    [conversationId, isStreaming, queryClient, createCallbacks]
  )

  const approveToolExecution = useCallback(
    async (approvalId: string) => {
      if (isStreaming) return

      setIsStreaming(true)
      setPendingApproval(null)
      abortRef.current = false

      await streamToolApproval(
        { conversationId, approvalId, approved: true },
        createCallbacks()
      )
    },
    [conversationId, isStreaming, createCallbacks]
  )

  const rejectToolExecution = useCallback(
    async (approvalId: string) => {
      if (isStreaming) return

      setIsStreaming(true)
      setPendingApproval(null)
      abortRef.current = false

      await streamToolApproval(
        { conversationId, approvalId, approved: false },
        createCallbacks()
      )
    },
    [conversationId, isStreaming, createCallbacks]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(() => {
    setError(null)
    queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
  }, [queryClient, conversationId])

  return {
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
    clearError,
    retry,
  }
}
