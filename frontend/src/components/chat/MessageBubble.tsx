import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import { Highlight, themes } from "prism-react-renderer"
import { cn, formatTime } from "@/lib/utils"
import type { Message } from "@/lib/api"

interface MessageBubbleProps {
  message: Message
}

function CodeBlock({ className, children }: { className?: string; children: string }) {
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : "text"
  const code = String(children).replace(/\n$/, "")

  return (
    <Highlight theme={themes.nightOwl} code={code} language={language}>
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={cn(hlClassName, "overflow-x-auto rounded-md p-3 text-sm")} style={style}>
          {tokens.map((line, lineIndex) => (
            <div key={lineIndex} {...getLineProps({ line })}>
              {line.map((token, tokenIndex) => (
                <span key={tokenIndex} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
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
      a: ({ href, children }: React.ComponentProps<"a">) => (
        <a href={href} className="text-blue-500 underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
      blockquote: ({ children }: React.ComponentProps<"blockquote">) => (
        <blockquote className="border-l-4 border-muted-foreground/30 pl-3 italic">{children}</blockquote>
      ),
    }),
    []
  )

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
        </div>
        <div className={cn("mt-1 text-xs", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
})
