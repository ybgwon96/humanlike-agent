import { useState, useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PushToTalkButton } from "./PushToTalkButton"
import { TranscriptionDisplay } from "./TranscriptionDisplay"
import { VoicePlayback } from "./VoicePlayback"
import { MessageBubble } from "./MessageBubble"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection"
import { sendVoiceMessage, fetchMessages, type Message } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

interface VoiceInterfaceProps {
  conversationId: string
}

interface Transcription {
  text: string
  confidence: number
}

export function VoiceInterface({ conversationId }: VoiceInterfaceProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [pendingResponse, setPendingResponse] = useState<Message | null>(null)

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 5000,
  })

  const voiceMutation = useMutation({
    mutationFn: (audio: Blob) => sendVoiceMessage(conversationId, audio),
    onSuccess: (data) => {
      setTranscription(data.transcription)
      setPendingResponse(data.message)
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "음성 전송에 실패했습니다")
    },
  })

  const handleAudioData = useCallback(
    (blob: Blob) => {
      setError(null)
      setTranscription(null)
      voiceMutation.mutate(blob)
    },
    [voiceMutation]
  )

  const handleRecorderError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  const { state, startRecording, stopRecording, audioLevel } = useAudioRecorder({
    onAudioData: handleAudioData,
    onError: handleRecorderError,
  })

  const { checkActivity, reset: resetVAD } = useVoiceActivityDetection({
    silenceDuration: 1500,
    onSilenceDetected: stopRecording,
  })

  useEffect(() => {
    if (state === "recording") {
      checkActivity(audioLevel)
    }
  }, [state, audioLevel, checkActivity])

  useEffect(() => {
    if (state !== "recording") {
      resetVAD()
    }
  }, [state, resetVAD])

  const handleRetry = useCallback(() => {
    setError(null)
  }, [])

  const handlePlaybackComplete = useCallback(() => {
    setPendingResponse(null)
  }, [])

  const lastAgentMessage = messages.filter((m) => m.sender === "AGENT").slice(-1)[0]

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
        <div className="space-y-4">
          {messages.slice(-5).map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-background p-6">
        {transcription && <TranscriptionDisplay {...transcription} className="mb-4" />}

        {pendingResponse && lastAgentMessage && (
          <VoicePlayback
            text={lastAgentMessage.content}
            autoPlay
            onPlaybackComplete={handlePlaybackComplete}
            className="mb-4"
          />
        )}

        <div className="flex justify-center">
          <PushToTalkButton
            state={state}
            audioLevel={audioLevel}
            onStart={startRecording}
            onStop={stopRecording}
            disabled={voiceMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
