import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorAlertProps {
  error: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  retryLabel?: string
}

export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  className,
  retryLabel = "재시도",
}: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      className={cn("animate-in fade-in slide-in-from-top-2", className)}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex items-center justify-between gap-2">
        <span className="flex-1">{error}</span>
        <div className="flex items-center gap-1 shrink-0">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-7 px-2 hover:bg-destructive/20"
            >
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
              {retryLabel}
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 px-2 hover:bg-destructive/20"
              aria-label="알림 닫기"
            >
              닫기
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
