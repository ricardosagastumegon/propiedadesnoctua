import { APPROVAL_STATUS_COLORS, APPROVAL_STATUSES } from "@/lib/schemas/authorization"

interface Props {
  status: string
}

export function ApprovalBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${APPROVAL_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {APPROVAL_STATUSES[status] ?? status}
    </span>
  )
}
