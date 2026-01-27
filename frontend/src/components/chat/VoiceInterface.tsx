import { useState, useCallback, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PushToTalkButton } from "./PushToTalkButton"
import { TranscriptionDisplay } from "./TranscriptionDisplay"
import { VoicePlayback } from "./VoicePlayback"
import { MessageBubble } from "./MessageBubble"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection"
import { sendVoiceMessage, fetchMessages, streamTextMessage } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

interface VoiceInterfaceProps {
  conversationId: string
}

interface Transcription {
  text: string
  confidence: number
}

type VoiceState = "idle" | "recording" | "processing_stt" | "generating_ai" | "playing_tts"

export function VoiceInterface({ conversationId }: VoiceInterfaceProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [streamingContent, setStreamingContent] = useState("")
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [aiResponseText, setAiResponseText] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const abortRef = useRef(false)

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 5000,
  })

  const handleAudioData = useCallback(
    async (blob: Blob) => {
      if (isProcessing) return

      setError(null)
      setTranscription(null)
      setStreamingContent("")
      setAiResponseText(null)
      setIsProcessing(true)
      abortRef.current = false

      try {
        // Step 1: STT 처리
        setVoiceState("processing_stt")
        const sttResult = await sendVoiceMessage(conversationId, blob)

        if (abortRef.current) return

        setTranscription(sttResult.transcription)
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })

        // Step 2: AI 응답 스트리밍
        setVoiceState("generating_ai")
        let fullResponse = ""

        await streamTextMessage(
          { conversationId, content: sttResult.transcription.text },
          {
            onChunk: (chunk) => {
              if (abortRef.current) return
              fullResponse += chunk
              setStreamingContent(fullResponse)
            },
            onComplete: () => {
              if (abortRef.current) return
              setAiResponseText(fullResponse)
              setVoiceState("playing_tts")
              queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
            },
            onError: (errorMsg) => {
              setError(errorMsg)
              setVoiceState("idle")
              setIsProcessing(false)
            },
          }
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "음성 처리에 실패했습니다")
        setVoiceState("idle")
        setIsProcessing(false)
      }
    },
    [conversationId, isProcessing, queryClient]
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

  useEffect(() => {
    if (state === "recording" && voiceState === "idle") {
      setVoiceState("recording")
    }
  }, [state, voiceState])

  const handleRetry = useCallback(() => {
    setError(null)
    setVoiceState("idle")
    setIsProcessing(false)
  }, [])

  const handlePlaybackComplete = useCallback(() => {
    setAiResponseText(null)
    setStreamingContent("")
    setVoiceState("idle")
    setIsProcessing(false)
  }, [])

  const getStatusText = useCallback(() => {
    switch (voiceState) {
      case "recording":
        return "듣고 있어요..."
      case "processing_stt":
        return "음성 변환 중..."
      case "generating_ai":
        return "생각 중..."
      case "playing_tts":
        return "응답 재생 중..."
      default:
        return "버튼을 누르고 말하세요"
    }
  }, [voiceState])

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

        {voiceState === "generating_ai" && streamingContent && (
          <div className="mb-4 rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">AI 응답 생성 중...</span>
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
            state={state}
            audioLevel={audioLevel}
            onStart={startRecording}
            onStop={stopRecording}
            disabled={isProcessing}
          />
          <span className="text-sm text-muted-foreground">{getStatusText()}</span>
        </div>
      </div>
    </div>
  )
}
