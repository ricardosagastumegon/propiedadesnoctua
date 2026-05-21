import { Skeleton } from "@/components/shared/skeleton"

export default function PropertyDetailLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-56" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64" />
    </div>
  )
}
