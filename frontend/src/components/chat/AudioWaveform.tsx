import { useRef, useEffect, useCallback, memo } from "react"
import { cn } from "@/lib/utils"

interface AudioWaveformProps {
  progress: number
  isPlaying: boolean
  className?: string
}

const BAR_COUNT = 40
const MIN_HEIGHT = 0.2
const MAX_HEIGHT = 1

function generateWaveformData(): number[] {
  return Array.from({ length: BAR_COUNT }, () => Math.random() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT)
}

export const AudioWaveform = memo(function AudioWaveform({ progress, isPlaying, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformDataRef = useRef<number[]>(generateWaveformData())
  const animationRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const barWidth = rect.width / BAR_COUNT
    const gap = 2
    const actualBarWidth = barWidth - gap
    const progressIndex = Math.floor((progress / 100) * BAR_COUNT)

    waveformDataRef.current.forEach((value, index) => {
      const x = index * barWidth + gap / 2
      const animatedValue = isPlaying ? value * (0.8 + 0.2 * Math.sin(phaseRef.current + index * 0.2)) : value
      const barHeight = animatedValue * (rect.height - 8)
      const y = (rect.height - barHeight) / 2

      const isCompleted = index < progressIndex

      ctx.fillStyle = isCompleted
        ? "hsl(var(--primary))"
        : isPlaying
          ? "hsl(var(--muted-foreground) / 0.5)"
          : "hsl(var(--muted-foreground) / 0.3)"

      ctx.beginPath()
      ctx.roundRect(x, y, actualBarWidth, barHeight, 2)
      ctx.fill()
    })

    if (isPlaying) {
      phaseRef.current += 0.1
      animationRef.current = requestAnimationFrame(draw)
    }
  }, [progress, isPlaying])

  useEffect(() => {
    draw()

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw, isPlaying])

  return <canvas ref={canvasRef} className={cn("h-12 w-full", className)} />
})
