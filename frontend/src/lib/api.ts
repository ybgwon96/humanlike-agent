export interface Message {
  id: string
  conversationId: string
  sender: "USER" | "AGENT"
  inputType: "text" | "voice" | "system"
  content: string
  createdAt: string
  voiceMetadata?: {
    transcriptionConfidence: number
    audioDuration: number
    audioUrl: string | null
  } | null
}

export interface SendMessageRequest {
  conversationId: string
  content: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface TextMessageResponse {
  messageId: string
  content: string
  timestamp: string
}

interface VoiceMessageResponse {
  messageId: string
  transcription: string
  confidence: number
  duration: number
  lowConfidence: boolean
}

const API_BASE = "/api/v1"

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`)
  }
  const result = await response.json() as ApiResponse<T>
  return result.data
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/messages/conversation/${conversationId}`)
  return handleResponse<Message[]>(response)
}

export async function sendTextMessage(request: SendMessageRequest): Promise<Message> {
  const response = await fetch(`${API_BASE}/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  const result = await handleResponse<TextMessageResponse>(response)

  return {
    id: result.messageId,
    conversationId: request.conversationId,
    sender: "USER",
    inputType: "text",
    content: result.content,
    createdAt: result.timestamp,
  }
}

export async function sendVoiceMessage(
  conversationId: string,
  audio: Blob
): Promise<{ message: Message; transcription: { text: string; confidence: number } }> {
  const formData = new FormData()
  formData.append("audio", audio, "recording.webm")

  const response = await fetch(`${API_BASE}/chat/voice?conversationId=${conversationId}`, {
    method: "POST",
    body: formData,
  })
  const result = await handleResponse<VoiceMessageResponse>(response)

  return {
    message: {
      id: result.messageId,
      conversationId,
      sender: "USER",
      inputType: "voice",
      content: result.transcription,
      createdAt: new Date().toISOString(),
    },
    transcription: {
      text: result.transcription,
      confidence: result.confidence,
    },
  }
}

export async function generateTTS(text: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "TTS failed" }))
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`)
  }

  return response.blob()
}

export interface User {
  id: string
  externalId: string
  createdAt: string
}

export interface Conversation {
  id: string
  userId: string
  mode: "text" | "voice"
  isActive: boolean
  createdAt: string
}

export async function createUser(externalId: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ externalId }),
  })
  return handleResponse<User>(response)
}

export async function createConversation(userId: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  })
  return handleResponse<Conversation>(response)
}

export interface ToolApprovalData {
  id: string
  toolName: string
  toolInput: Record<string, unknown>
  riskLevel: number
  reason: string
}

export interface ToolResultData {
  toolName: string
  success: boolean
  output: unknown
  error?: string
}

interface StreamChunk {
  type: "content" | "done" | "error" | "message_saved" | "tool_approval" | "tool_result"
  data: string
  messageId?: string
  toolApproval?: ToolApprovalData
  toolResult?: ToolResultData
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onComplete: (agentMessageId?: string) => void
  onError: (error: string) => void
  onUserMessageSaved?: (messageId: string) => void
  onToolApproval?: (approval: ToolApprovalData) => void
  onToolResult?: (result: ToolResultData) => void
}

export interface Notification {
  id: string
  userId: string
  type: "greeting" | "reminder" | "alert" | "proactive"
  priority: "low" | "normal" | "high"
  title: string
  content: string
  ttsEnabled: boolean
  soundEnabled: boolean
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

export async function fetchPendingNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
  const response = await fetch(`${API_BASE}/notifications/pending?limit=${limit}`, {
    headers: { "x-user-id": userId },
  })
  return handleResponse<Notification[]>(response)
}

export async function dismissNotification(notificationId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/dismiss/${notificationId}`, {
    method: "POST",
    headers: { "x-user-id": userId },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Dismiss failed" }))
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`)
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/read/${notificationId}`, {
    method: "POST",
    headers: { "x-user-id": userId },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Mark as read failed" }))
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`)
  }
}

export async function streamTextMessage(
  request: SendMessageRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    callbacks.onError(error.error?.message || error.message || `HTTP ${response.status}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError("스트림을 읽을 수 없습니다")
    return
  }

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr) {
            try {
              const chunk = JSON.parse(jsonStr) as StreamChunk

              switch (chunk.type) {
                case "content":
                  callbacks.onChunk(chunk.data)
                  break
                case "done":
                  callbacks.onComplete(chunk.messageId || "")
                  break
                case "error":
                  callbacks.onError(chunk.data)
                  break
                case "message_saved":
                  callbacks.onUserMessageSaved?.(chunk.messageId || "")
                  break
                case "tool_approval":
                  if (chunk.toolApproval) {
                    callbacks.onToolApproval?.(chunk.toolApproval)
                  }
                  break
                case "tool_result":
                  if (chunk.toolResult) {
                    callbacks.onToolResult?.(chunk.toolResult)
                  }
                  break
              }
            } catch {
              // JSON parse 실패 무시
            }
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : "스트림 오류")
  } finally {
    reader.releaseLock()
  }
}

export interface ToolApprovalRequest {
  conversationId: string
  approvalId: string
  approved: boolean
}

export async function streamToolApproval(
  request: ToolApprovalRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/tool-approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    callbacks.onError(error.error?.message || error.message || `HTTP ${response.status}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError("스트림을 읽을 수 없습니다")
    return
  }

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr) {
            try {
              const chunk = JSON.parse(jsonStr) as StreamChunk

              switch (chunk.type) {
                case "content":
                  callbacks.onChunk(chunk.data)
                  break
                case "done":
                  callbacks.onComplete(chunk.messageId || "")
                  break
                case "error":
                  callbacks.onError(chunk.data)
                  break
                case "tool_approval":
                  if (chunk.toolApproval) {
                    callbacks.onToolApproval?.(chunk.toolApproval)
                  }
                  break
                case "tool_result":
                  if (chunk.toolResult) {
                    callbacks.onToolResult?.(chunk.toolResult)
                  }
                  break
              }
            } catch {
              // JSON parse 실패 무시
            }
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : "스트림 오류")
  } finally {
    reader.releaseLock()
  }
}
