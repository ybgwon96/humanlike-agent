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
