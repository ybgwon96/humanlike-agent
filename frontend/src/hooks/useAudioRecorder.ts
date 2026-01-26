import { useState, useCallback, useRef, useEffect } from "react"

export type RecordingState = "idle" | "requesting" | "recording" | "processing"

interface UseAudioRecorderOptions {
  onAudioData?: (blob: Blob) => void
  onError?: (error: Error) => void
}

interface UseAudioRecorderReturn {
  state: RecordingState
  startRecording: () => Promise<void>
  stopRecording: () => void
  audioLevel: number
  error: string | null
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 16000,
}

export function useAudioRecorder({ onAudioData, onError }: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle")
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    chunksRef.current = []
    setAudioLevel(0)
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalized = Math.min(average / 128, 1)
    setAudioLevel(normalized)

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setState("requesting")

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        setState("processing")
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        onAudioData?.(audioBlob)
        cleanup()
        setState("idle")
      }

      mediaRecorder.onerror = () => {
        const err = new Error("녹음 중 오류가 발생했습니다")
        setError(err.message)
        onError?.(err)
        cleanup()
        setState("idle")
      }

      mediaRecorder.start(100)
      setState("recording")
      updateAudioLevel()
    } catch (err) {
      const message = err instanceof Error ? err.message : "마이크 권한을 허용해주세요"
      setError(message)
      onError?.(err instanceof Error ? err : new Error(message))
      cleanup()
      setState("idle")
    }
  }, [cleanup, onAudioData, onError, updateAudioLevel])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return {
    state,
    startRecording,
    stopRecording,
    audioLevel,
    error,
  }
}
