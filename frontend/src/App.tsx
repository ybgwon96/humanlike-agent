import { useState, useEffect } from "react"
import { TextChatInterface } from "@/components/chat/TextChatInterface"
import { VoiceInterface } from "@/components/chat/VoiceInterface"
import { createUser, createConversation } from "@/lib/api"

type ChatMode = "text" | "voice"

const STORAGE_KEY = "humanlike-agent-session"

interface Session {
  userId: string
  conversationId: string
}

function getStoredSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Session
    }
  } catch {
    // ignore
  }
  return null
}

function storeSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function App() {
  const [mode, setMode] = useState<ChatMode>("text")
  const [session, setSession] = useState<Session | null>(getStoredSession)
  const [isInitializing, setIsInitializing] = useState(!session)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) return

    const initSession = async () => {
      try {
        setIsInitializing(true)
        setError(null)

        const user = await createUser(`guest-${Date.now()}`)
        const conversation = await createConversation(user.id)

        const newSession = {
          userId: user.id,
          conversationId: conversation.id,
        }
        storeSession(newSession)
        setSession(newSession)
      } catch (err) {
        setError(err instanceof Error ? err.message : "세션 초기화에 실패했습니다")
      } finally {
        setIsInitializing(false)
      }
    }

    initSession()
  }, [session])

  const handleNewConversation = async () => {
    if (!session) return

    try {
      setIsInitializing(true)
      const conversation = await createConversation(session.userId)
      const newSession = {
        ...session,
        conversationId: conversation.id,
      }
      storeSession(newSession)
      setSession(newSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : "새 대화 생성에 실패했습니다")
    } finally {
      setIsInitializing(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">초기화 중...</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error || "세션을 초기화할 수 없습니다"}</p>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setSession(null)
              setError(null)
            }}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-semibold">Humanlike Agent</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-secondary/80"
            >
              New Chat
            </button>
            <button
              onClick={() => setMode("text")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "text"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "voice"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Voice
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        {mode === "text" ? (
          <TextChatInterface conversationId={session.conversationId} />
        ) : (
          <VoiceInterface conversationId={session.conversationId} />
        )}
      </main>
    </div>
  )
}

export default App
