import { useEffect, useCallback, useState } from "react"
import { X, Bell, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { generateTTS } from "@/lib/api"
import { useAudioPlayback } from "@/hooks/useAudioPlayback"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/api"

interface NotificationOverlayProps {
  notification: Notification | null
  mode: "text" | "voice"
  onDismiss: () => void
  onAction?: () => void
  className?: string
}

const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3"

export function NotificationOverlay({
  notification,
  mode,
  onDismiss,
  onAction,
  className,
}: NotificationOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasPlayedSound, setHasPlayedSound] = useState(false)
  const { play: playTTS, stop: stopTTS, state: ttsState } = useAudioPlayback({
    onEnded: () => setHasPlayedSound(true),
  })

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setHasPlayedSound(false)
    } else {
      setIsVisible(false)
    }
  }, [notification])

  const playNotificationSound = useCallback(async () => {
    if (!notification?.soundEnabled) return

    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL)
      await audio.play()
    } catch {
      // 알림음 재생 실패 무시
    }
  }, [notification?.soundEnabled])

  const playTTSContent = useCallback(async () => {
    if (!notification?.ttsEnabled || mode !== "voice") return

    try {
      const audioBlob = await generateTTS(notification.content)
      playTTS(audioBlob)
    } catch {
      // TTS 재생 실패 무시
    }
  }, [notification, mode, playTTS])

  useEffect(() => {
    if (!notification || hasPlayedSound) return

    playNotificationSound()

    if (mode === "voice" && notification.ttsEnabled) {
      const timer = setTimeout(() => {
        playTTSContent()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [notification, hasPlayedSound, mode, playNotificationSound, playTTSContent])

  const handleDismiss = useCallback(() => {
    stopTTS()
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }, [onDismiss, stopTTS])

  const handleAction = useCallback(() => {
    stopTTS()
    onAction?.()
    handleDismiss()
  }, [onAction, handleDismiss, stopTTS])

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "normal":
        return "default"
      case "low":
        return "secondary"
    }
  }

  if (!notification) return null

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-4 z-50 mx-auto max-w-md px-4 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        className
      )}
    >
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">{notification.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
              {notification.priority}
            </Badge>
            {mode === "voice" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => (ttsState === "playing" ? stopTTS() : playTTSContent())}
              >
                {ttsState === "playing" ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground">{notification.content}</p>

          {onAction && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={handleAction}>
                대화 시작
              </Button>
            </div>
          )}

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-[10000ms] ease-linear"
              style={{ width: isVisible ? "0%" : "100%" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
