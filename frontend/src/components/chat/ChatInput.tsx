import { useState, useCallback, useRef, type KeyboardEvent, forwardRef, useImperativeHandle } from "react"
import { Send, Loader2, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface ChatInputRef {
  focus: () => void
  clear: () => void
}

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
  className?: string
  maxLength?: number
  showEmojiButton?: boolean
  onEmojiClick?: () => void
}

const MAX_HEIGHT = 200
const MIN_HEIGHT = 40

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  {
    onSend,
    disabled = false,
    isLoading = false,
    placeholder = "메시지를 입력하세요...",
    className,
    maxLength = 4000,
    showEmojiButton = false,
    onEmojiClick,
  },
  ref
) {
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    clear: () => {
      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    },
  }))

  const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed || disabled || isLoading) return

    onSend(trimmed)
    setContent("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [content, disabled, isLoading, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter: 전송, Shift+Enter: 줄바꿈
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
        return
      }

      // Ctrl/Cmd + Enter: 전송 (대체 단축키)
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
        return
      }
    },
    [handleSend]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (value.length <= maxLength) {
        setContent(value)
        adjustHeight(e.target)
      }
    },
    [maxLength, adjustHeight]
  )

  const isDisabled = disabled || isLoading
  const canSend = content.trim().length > 0 && !isDisabled

  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t border-border bg-background p-4",
        className
      )}
      role="form"
      aria-label="메시지 입력"
    >
      {showEmojiButton && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEmojiClick}
          disabled={isDisabled}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="이모지 선택"
        >
          <Smile className="h-5 w-5" />
        </Button>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        rows={1}
        className={cn(
          "min-h-[40px] max-h-[200px] resize-none transition-colors",
          "focus-visible:ring-1 focus-visible:ring-ring"
        )}
        style={{ minHeight: MIN_HEIGHT }}
        aria-label="메시지 입력창"
        aria-describedby="input-hint"
      />

      <span id="input-hint" className="sr-only">
        Enter 키로 전송, Shift+Enter로 줄바꿈
      </span>

      <Button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className={cn(
          "shrink-0 transition-all",
          canSend && "bg-primary hover:bg-primary/90"
        )}
        aria-label={isLoading ? "전송 중" : "메시지 전송"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
})
