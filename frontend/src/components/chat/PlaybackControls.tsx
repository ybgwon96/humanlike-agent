import { Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PlaybackState, PlaybackSpeed } from "@/hooks/useAudioPlayback"

interface PlaybackControlsProps {
  state: PlaybackState
  speed: PlaybackSpeed
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onSpeedChange: (speed: PlaybackSpeed) => void
  className?: string
}

const SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25]

function formatSpeed(speed: PlaybackSpeed): string {
  return `${speed}x`
}

export function PlaybackControls({
  state,
  speed,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
  className,
}: PlaybackControlsProps) {
  const isPlaying = state === "playing"
  const isPaused = state === "paused"
  const isLoading = state === "loading"

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause()
    } else if (isPaused) {
      onResume()
    } else {
      onPlay()
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        disabled={isLoading || state === "idle"}
        className="h-10 w-10"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onStop}
        disabled={state === "idle" || isLoading}
        className="h-10 w-10"
      >
        <Square className="h-4 w-4" />
      </Button>

      <div className="ml-2 flex items-center gap-1 rounded-lg bg-muted p-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              speed === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {formatSpeed(s)}
          </button>
        ))}
      </div>
    </div>
  )
}
