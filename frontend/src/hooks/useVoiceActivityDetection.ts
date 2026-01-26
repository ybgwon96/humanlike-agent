import { useRef, useCallback, useEffect } from "react"

interface UseVoiceActivityDetectionOptions {
  silenceThreshold?: number
  silenceDuration?: number
  onSilenceDetected?: () => void
}

interface UseVoiceActivityDetectionReturn {
  checkActivity: (audioLevel: number) => void
  reset: () => void
}

const DEFAULT_SILENCE_THRESHOLD = 0.05
const DEFAULT_SILENCE_DURATION = 1500

export function useVoiceActivityDetection({
  silenceThreshold = DEFAULT_SILENCE_THRESHOLD,
  silenceDuration = DEFAULT_SILENCE_DURATION,
  onSilenceDetected,
}: UseVoiceActivityDetectionOptions = {}): UseVoiceActivityDetectionReturn {
  const silenceStartRef = useRef<number | null>(null)
  const hasSpokenRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    silenceStartRef.current = null
    hasSpokenRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return reset
  }, [reset])

  const checkActivity = useCallback(
    (audioLevel: number) => {
      const now = Date.now()

      if (audioLevel > silenceThreshold) {
        hasSpokenRef.current = true
        silenceStartRef.current = null
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      } else if (hasSpokenRef.current) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = now
        }

        const silentTime = now - silenceStartRef.current

        if (silentTime >= silenceDuration && !timeoutRef.current) {
          timeoutRef.current = window.setTimeout(() => {
            onSilenceDetected?.()
            reset()
          }, 0)
        }
      }
    },
    [silenceThreshold, silenceDuration, onSilenceDetected, reset]
  )

  return { checkActivity, reset }
}
