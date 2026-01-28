import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PushToTalkButton } from "./PushToTalkButton"
import { TranscriptionDisplay } from "./TranscriptionDisplay"
import { VoicePlayback } from "./VoicePlayback"
import { MessageBubble } from "./MessageBubble"
import { ErrorAlert } from "@/components/ui/ErrorAlert"
import { useVoiceChat } from "@/hooks/useVoiceChat"
import { fetchMessages } from "@/lib/api"

interface VoiceInterfaceProps {
  conversationId: string
}

export function VoiceInterface({ conversationId }: VoiceInterfaceProps) {
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 5000,
  })

  const {
    voiceState,
    recorderState,
    audioLevel,
    transcription,
    streamingContent,
    aiResponseText,
    error,
    isProcessing,
    startRecording,
    stopRecording,
    handlePlaybackComplete,
    clearError,
    getStatusText,
  } = useVoiceChat({ conversationId })

  return (
    <div className="flex h-[100dvh] md:h-[calc(100vh-64px)] flex-col">
      {error && (
        <div className="shrink-0 p-4 pb-0">
          <ErrorAlert error={error} onRetry={clearError} />
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-2">
        <div
          className="space-y-4 pb-4"
          role="log"
          aria-label="채팅 메시지"
          aria-live="polite"
        >
          {messages.slice(-5).map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border bg-background p-4 md:p-6 safe-area-inset-bottom">
        {transcription && (
          <TranscriptionDisplay {...transcription} className="mb-4" />
        )}

        {voiceState === "generating_ai" && streamingContent && (
          <div
            className="mb-4 rounded-lg border bg-card p-4"
            role="status"
            aria-live="polite"
          >
            <div className="mb-2 flex items-center gap-2">
              <Loader2
                className="h-4 w-4 animate-spin text-primary"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-muted-foreground">
                AI 응답 생성 중...
              </span>
            </div>
            <p className="text-sm text-foreground">{streamingContent}</p>
          </div>
        )}

        {aiResponseText && voiceState === "playing_tts" && (
          <VoicePlayback
            text={aiResponseText}
            autoPlay
            onPlaybackComplete={handlePlaybackComplete}
            className="mb-4"
          />
        )}

        <div className="flex flex-col items-center gap-2">
          <PushToTalkButton
            state={recorderState}
            audioLevel={audioLevel}
            onStart={startRecording}
            onStop={stopRecording}
            disabled={isProcessing}
          />
          <span
            className="text-sm text-muted-foreground text-center"
            role="status"
            aria-live="polite"
          >
            {getStatusText()}
          </span>
        </div>
      </div>
    </div>
  )
}
