import { Skeleton } from "@/components/shared/skeleton"

export default function TicketDetailLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
