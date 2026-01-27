import { useState, useEffect, useCallback, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchPendingNotifications,
  dismissNotification as dismissNotificationApi,
  markNotificationAsRead,
  type Notification,
} from "@/lib/api"

interface DNDSettings {
  enabled: boolean
  startHour: number
  endHour: number
}

interface UseNotificationsOptions {
  userId: string
  pollingInterval?: number
  dndSettings?: DNDSettings
  onNewNotification?: (notification: Notification) => void
}

export function useNotifications({
  userId,
  pollingInterval = 30000,
  dndSettings,
  onNewNotification,
}: UseNotificationsOptions) {
  const queryClient = useQueryClient()
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null)
  const previousNotificationIdsRef = useRef<Set<string>>(new Set())
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isDNDActive = useCallback(() => {
    if (!dndSettings?.enabled) return false

    const currentHour = new Date().getHours()
    const { startHour, endHour } = dndSettings

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour
    }
    return currentHour >= startHour || currentHour < endHour
  }, [dndSettings])

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchPendingNotifications(userId),
    refetchInterval: pollingInterval,
    enabled: !!userId && !isDNDActive(),
  })

  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) => dismissNotificationApi(notificationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
    },
  })

  const readMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
    },
  })

  useEffect(() => {
    if (isDNDActive() || notifications.length === 0) return

    const currentIds = new Set(notifications.map((n) => n.id))
    const newNotifications = notifications.filter(
      (n) => !previousNotificationIdsRef.current.has(n.id) && !n.isRead
    )

    if (newNotifications.length > 0) {
      const highestPriorityNotification = newNotifications.reduce((prev, curr) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        return priorityOrder[curr.priority] > priorityOrder[prev.priority] ? curr : prev
      })

      setActiveNotification(highestPriorityNotification)
      onNewNotification?.(highestPriorityNotification)
    }

    previousNotificationIdsRef.current = currentIds
  }, [notifications, isDNDActive, onNewNotification])

  useEffect(() => {
    if (activeNotification) {
      autoDismissTimerRef.current = setTimeout(() => {
        dismissNotification(activeNotification.id)
      }, 10000)
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current)
      }
    }
  }, [activeNotification])

  const dismissNotification = useCallback(
    (notificationId: string) => {
      if (activeNotification?.id === notificationId) {
        setActiveNotification(null)
      }
      dismissMutation.mutate(notificationId)

      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current)
        autoDismissTimerRef.current = null
      }
    },
    [activeNotification, dismissMutation]
  )

  const markAsRead = useCallback(
    (notificationId: string) => {
      readMutation.mutate(notificationId)
    },
    [readMutation]
  )

  const clearActiveNotification = useCallback(() => {
    if (activeNotification) {
      dismissNotification(activeNotification.id)
    }
  }, [activeNotification, dismissNotification])

  return {
    notifications,
    activeNotification,
    isLoading,
    error,
    isDNDActive: isDNDActive(),
    dismissNotification,
    markAsRead,
    clearActiveNotification,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }
}
