import { useState, useCallback, useRef, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { sendVoiceMessage, streamTextMessage } from "@/lib/api"
import { useAudioRecorder, type RecordingState } from "./useAudioRecorder"
import { useVoiceActivityDetection } from "./useVoiceActivityDetection"

export type VoiceChatState =
  | "idle"
  | "recording"
  | "processing_stt"
  | "generating_ai"
  | "playing_tts"

export interface Transcription {
  text: string
  confidence: number
}

export interface UseVoiceChatOptions {
  conversationId: string
  silenceDuration?: number
}

export interface UseVoiceChatReturn {
  voiceState: VoiceChatState
  recorderState: RecordingState
  audioLevel: number
  transcription: Transcription | null
  streamingContent: string
  aiResponseText: string | null
  error: string | null
  isProcessing: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  handlePlaybackComplete: () => void
  clearError: () => void
  getStatusText: () => string
}

const STATUS_TEXT: Record<VoiceChatState, string> = {
  idle: "버튼을 누르고 말하세요",
  recording: "듣고 있어요...",
  processing_stt: "음성 변환 중...",
  generating_ai: "생각 중...",
  playing_tts: "응답 재생 중...",
}

export function useVoiceChat({
  conversationId,
  silenceDuration = 1500,
}: UseVoiceChatOptions): UseVoiceChatReturn {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [streamingContent, setStreamingContent] = useState("")
  const [voiceState, setVoiceState] = useState<VoiceChatState>("idle")
  const [aiResponseText, setAiResponseText] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const abortRef = useRef(false)

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
        setVoiceState("processing_stt")
        const sttResult = await sendVoiceMessage(conversationId, blob)

        if (abortRef.current) return

        setTranscription(sttResult.transcription)
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })

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

  const { state: recorderState, startRecording, stopRecording, audioLevel } = useAudioRecorder({
    onAudioData: handleAudioData,
    onError: handleRecorderError,
  })

  const { checkActivity, reset: resetVAD } = useVoiceActivityDetection({
    silenceDuration,
    onSilenceDetected: stopRecording,
  })

  useEffect(() => {
    if (recorderState === "recording") {
      checkActivity(audioLevel)
    }
  }, [recorderState, audioLevel, checkActivity])

  useEffect(() => {
    if (recorderState !== "recording") {
      resetVAD()
    }
  }, [recorderState, resetVAD])

  useEffect(() => {
    if (recorderState === "recording" && voiceState === "idle") {
      setVoiceState("recording")
    }
  }, [recorderState, voiceState])

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  const handlePlaybackComplete = useCallback(() => {
    setAiResponseText(null)
    setStreamingContent("")
    setVoiceState("idle")
    setIsProcessing(false)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setVoiceState("idle")
    setIsProcessing(false)
  }, [])

  const getStatusText = useCallback(() => STATUS_TEXT[voiceState], [voiceState])

  return {
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
  }
}
