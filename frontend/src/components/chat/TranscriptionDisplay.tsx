import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TranscriptionDisplayProps {
  text: string
  confidence: number
  className?: string
}

const CONFIDENCE_THRESHOLD = 0.6

export function TranscriptionDisplay({ text, confidence, className }: TranscriptionDisplayProps) {
  const isLowConfidence = confidence < CONFIDENCE_THRESHOLD
  const confidencePercent = Math.round(confidence * 100)

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">전사 결과</span>
        <Badge variant={isLowConfidence ? "destructive" : "secondary"} className="text-xs">
          {confidencePercent}%
        </Badge>
      </div>

      <p className="text-foreground">{text}</p>

      {isLowConfidence && (
        <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <span>전사 정확도가 낮습니다. 다시 말씀해 주세요.</span>
        </div>
      )}
    </div>
  )
}
