import { useState, useCallback, useRef, useEffect } from "react"

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error"
export type PlaybackSpeed = 0.75 | 1 | 1.25

interface UseAudioPlaybackOptions {
  onEnded?: () => void
  onError?: (error: Error) => void
}

interface UseAudioPlaybackReturn {
  state: PlaybackState
  progress: number
  duration: number
  currentTime: number
  speed: PlaybackSpeed
  error: string | null
  play: (audioBlob: Blob) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (time: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
}

export function useAudioPlayback({ onEnded, onError }: UseAudioPlaybackOptions = {}): UseAudioPlaybackReturn {
  const [state, setState] = useState<PlaybackState>("idle")
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }

    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const updateProgress = useCallback(() => {
    if (!audioRef.current) return

    const current = audioRef.current.currentTime
    const total = audioRef.current.duration

    if (total > 0) {
      setCurrentTime(current)
      setProgress((current / total) * 100)
    }

    if (state === "playing") {
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [state])

  const play = useCallback(
    async (audioBlob: Blob) => {
      try {
        cleanup()
        setError(null)
        setState("loading")

        const url = URL.createObjectURL(audioBlob)
        urlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio
        audio.playbackRate = speed

        audio.onloadedmetadata = () => {
          setDuration(audio.duration)
        }

        audio.onended = () => {
          setState("idle")
          setProgress(100)
          onEnded?.()
        }

        audio.onerror = () => {
          const err = new Error("오디오 재생에 실패했습니다")
          setError(err.message)
          setState("error")
          onError?.(err)
        }

        await audio.play()
        setState("playing")
        animationFrameRef.current = requestAnimationFrame(updateProgress)
      } catch (err) {
        const message = err instanceof Error ? err.message : "재생을 시작할 수 없습니다"
        setError(message)
        setState("error")
        onError?.(err instanceof Error ? err : new Error(message))
      }
    },
    [cleanup, speed, onEnded, onError, updateProgress]
  )

  const pause = useCallback(() => {
    if (audioRef.current && state === "playing") {
      audioRef.current.pause()
      setState("paused")
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [state])

  const resume = useCallback(() => {
    if (audioRef.current && state === "paused") {
      audioRef.current.play()
      setState("playing")
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [state, updateProgress])

  const stop = useCallback(() => {
    cleanup()
    setState("idle")
  }, [cleanup])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration))
      audioRef.current.currentTime = clampedTime
      setCurrentTime(clampedTime)
      setProgress((clampedTime / audioRef.current.duration) * 100)
    }
  }, [])

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed
    }
  }, [])

  return {
    state,
    progress,
    duration,
    currentTime,
    speed,
    error,
    play,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
  }
}
