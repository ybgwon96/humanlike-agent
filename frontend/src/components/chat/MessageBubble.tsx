import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import { Highlight, themes } from "prism-react-renderer"
import { cn, formatTime } from "@/lib/utils"
import type { Message } from "@/lib/api"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TypeScript React",
  jsx: "JavaScript React",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Bash",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  text: "Plain Text",
}

function CodeBlock({ className, children }: { className?: string; children: string }) {
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : "text"
  const code = String(children).replace(/\n$/, "")
  const displayName = LANGUAGE_DISPLAY_NAMES[language] || language.toUpperCase()

  return (
    <div className="relative my-2" role="region" aria-label={`${displayName} 코드 블록`}>
      <div className="absolute right-2 top-2 z-10">
        <span className="rounded bg-black/50 px-2 py-0.5 text-xs text-gray-300">
          {displayName}
        </span>
      </div>
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(hlClassName, "overflow-x-auto rounded-md p-3 pt-8 text-sm")}
            style={style}
            tabIndex={0}
            aria-label={`${displayName} 코드`}
          >
            <code>
              {tokens.map((line, lineIndex) => (
                <div key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.sender === "USER"

  const markdownComponents = useMemo(
    () => ({
      code: ({ className, children, ...props }: React.ComponentProps<"code"> & { inline?: boolean }) => {
        const isInline = !className && typeof children === "string" && !children.includes("\n")
        if (isInline) {
          return (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props}>
              {children}
            </code>
          )
        }
        return <CodeBlock className={className}>{String(children)}</CodeBlock>
      },
      p: ({ children }: React.ComponentProps<"p">) => <p className="mb-2 last:mb-0">{children}</p>,
      ul: ({ children }: React.ComponentProps<"ul">) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
      ol: ({ children }: React.ComponentProps<"ol">) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
      li: ({ children }: React.ComponentProps<"li">) => <li className="mb-1">{children}</li>,
      a: ({ href, children }: React.ComponentProps<"a">) => {
        const linkText = typeof children === "string" ? children : "링크"
        return (
          <a
            href={href}
            className="text-chat-link underline hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-ring"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${linkText} (새 탭에서 열기)`}
          >
            {children}
          </a>
        )
      },
      blockquote: ({ children }: React.ComponentProps<"blockquote">) => (
        <blockquote className="border-l-4 border-muted-foreground/30 pl-3 italic">{children}</blockquote>
      ),
    }),
    []
  )

  const senderLabel = isUser ? "나" : "AI 어시스턴트"

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      role="article"
      aria-label={`${senderLabel}의 메시지`}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser ? "bg-chat-user text-primary-foreground" : "bg-chat-assistant text-foreground"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current"
              aria-label="입력 중"
            />
          )}
        </div>
        <time
          dateTime={message.createdAt}
          className={cn("mt-1 block text-xs", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
    </div>
  )
})
