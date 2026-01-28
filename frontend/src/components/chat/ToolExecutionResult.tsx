import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface ToolResultData {
  toolName: string
  success: boolean
  output: unknown
  error?: string
}

interface ToolExecutionResultProps {
  result: ToolResultData
}

export function ToolExecutionResult({ result }: ToolExecutionResultProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`p-3 ${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{result.toolName}</span>
        <Badge className={result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {result.success ? "성공" : "실패"}
        </Badge>
      </div>

      {result.error && (
        <p className="text-sm text-red-600 mb-2">{result.error}</p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-xs text-blue-600 hover:underline"
      >
        {expanded ? "결과 숨기기" : "결과 보기"}
      </button>

      {expanded && result.output !== null && (
        <pre className="text-xs bg-white/50 p-2 rounded mt-2 overflow-auto max-h-60">
          {typeof result.output === "string"
            ? result.output
            : JSON.stringify(result.output, null, 2)}
        </pre>
      )}
    </Card>
  )
}
