import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface ToolApprovalData {
  id: string
  toolName: string
  toolInput: Record<string, unknown>
  riskLevel: number
  reason: string
}

interface ToolApprovalRequestProps {
  approval: ToolApprovalData
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string) => void
  isProcessing: boolean
}

const RISK_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "낮음", color: "bg-green-100 text-green-800" },
  2: { label: "보통", color: "bg-yellow-100 text-yellow-800" },
  3: { label: "높음", color: "bg-red-100 text-red-800" },
}

export function ToolApprovalRequest({
  approval,
  onApprove,
  onReject,
  isProcessing,
}: ToolApprovalRequestProps) {
  const [expanded, setExpanded] = useState(false)
  const risk = RISK_LABELS[approval.riskLevel] ?? RISK_LABELS[3]

  return (
    <Card className="p-4 border-yellow-200 bg-yellow-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">도구 실행 승인 요청</span>
            <Badge className={risk.color}>{risk.label} 위험도</Badge>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            <strong>{approval.toolName}</strong> 도구를 실행하려고 합니다.
          </p>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-sm text-blue-600 hover:underline mb-2"
          >
            {expanded ? "입력값 숨기기" : "입력값 보기"}
          </button>

          {expanded && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(approval.toolInput, null, 2)}
            </pre>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(approval.id)}
            disabled={isProcessing}
          >
            거부
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(approval.id)}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "승인"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
