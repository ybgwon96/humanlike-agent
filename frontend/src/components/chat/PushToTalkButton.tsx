import { useCallback, useEffect, useRef, type KeyboardEvent } from "react"
import { Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecordingState } from "@/hooks/useAudioRecorder"

interface PushToTalkButtonProps {
  state: RecordingState
  audioLevel: number
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  className?: string
}

const STATE_LABELS: Record<RecordingState, string> = {
  idle: "길게 눌러 말하기",
  requesting: "권한 요청 중...",
  recording: "듣고 있어요...",
  processing: "처리 중...",
}

const ARIA_LABELS: Record<RecordingState, string> = {
  idle: "녹음 시작. 스페이스바 또는 엔터 키를 눌러 녹음을 시작하세요",
  requesting: "마이크 권한 요청 중",
  recording: "녹음 중. 키를 놓으면 녹음이 중지됩니다",
  processing: "음성 처리 중",
}

export function PushToTalkButton({
  state,
  audioLevel,
  onStart,
  onStop,
  disabled = false,
  className,
}: PushToTalkButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isRecording = state === "recording"

  const handleMouseDown = useCallback(() => {
    if (disabled || state !== "idle") return
    onStart()
  }, [disabled, state, onStart])

  const handleMouseUp = useCallback(() => {
    if (state === "recording") {
      onStop()
    }
  }, [state, onStop])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleMouseDown()
    },
    [handleMouseDown]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleMouseUp()
    },
    [handleMouseUp]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (disabled || state !== "idle") return
        onStart()
      }
    },
    [disabled, state, onStart]
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (state === "recording") {
          onStop()
        }
      }
    },
    [state, onStop]
  )

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (state === "recording") {
        onStop()
      }
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)
    window.addEventListener("touchend", handleGlobalMouseUp)

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      window.removeEventListener("touchend", handleGlobalMouseUp)
    }
  }, [state, onStop])

  const ringScale = 1 + audioLevel * 0.5

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        {isRecording && (
          <div
            className="absolute inset-0 rounded-full bg-red-500/20 transition-transform"
            style={{ transform: `scale(${ringScale})` }}
          />
        )}
        <button
          ref={buttonRef}
          type="button"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          disabled={disabled || state === "processing" || state === "requesting"}
          aria-label={ARIA_LABELS[state]}
          aria-pressed={isRecording}
          role="button"
          tabIndex={0}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isRecording ? "bg-chat-recording text-white shadow-lg shadow-red-500/50" : "bg-primary text-primary-foreground",
            !disabled && state === "idle" && "hover:bg-primary/90 active:scale-95"
          )}
        >
          {state === "idle" || state === "recording" ? (
            <Mic className={cn("h-8 w-8", isRecording && "animate-pulse")} />
          ) : (
            <MicOff className="h-8 w-8" />
          )}
        </button>
      </div>

      <span className="text-sm text-muted-foreground">{STATE_LABELS[state]}</span>
    </div>
  )
}
