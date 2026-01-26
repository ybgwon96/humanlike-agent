import { useEffect, useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { RefreshCw, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PlaybackControls } from "./PlaybackControls"
import { AudioWaveform } from "./AudioWaveform"
import { useAudioPlayback } from "@/hooks/useAudioPlayback"
import { generateTTS } from "@/lib/api"
import { cn } from "@/lib/utils"

interface VoicePlaybackProps {
  text: string
  autoPlay?: boolean
  onPlaybackComplete?: () => void
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function VoicePlayback({ text, autoPlay = false, onPlaybackComplete, className }: VoicePlaybackProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const { state, progress, duration, currentTime, speed, error, play, pause, resume, stop, setSpeed } =
    useAudioPlayback({
      onEnded: onPlaybackComplete,
    })

  const ttsMutation = useMutation({
    mutationFn: () => generateTTS(text),
    onSuccess: (blob) => {
      setAudioBlob(blob)
      if (autoPlay) {
        play(blob)
      }
    },
  })

  useEffect(() => {
    if (autoPlay && text) {
      ttsMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text])

  const handlePlay = useCallback(() => {
    if (audioBlob) {
      play(audioBlob)
    } else {
      ttsMutation.mutate()
    }
  }, [audioBlob, play, ttsMutation])

  const handleRetry = useCallback(() => {
    ttsMutation.mutate()
  }, [ttsMutation])

  const isLoading = ttsMutation.isPending || state === "loading"
  const hasError = ttsMutation.isError || state === "error"
  const errorMessage = ttsMutation.error?.message || error

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Volume2 className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-foreground line-clamp-3">{text}</p>
      </div>

      {hasError ? (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription className="flex items-center justify-between">
            <span>{errorMessage || "TTS 생성에 실패했습니다"}</span>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3 w-3" />
              재시도
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <AudioWaveform progress={progress} isPlaying={state === "playing"} className="mb-3" />

          <div className="flex items-center justify-between">
            <PlaybackControls
              state={isLoading ? "loading" : state}
              speed={speed}
              onPlay={handlePlay}
              onPause={pause}
              onResume={resume}
              onStop={stop}
              onSpeedChange={setSpeed}
            />

            <div className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
