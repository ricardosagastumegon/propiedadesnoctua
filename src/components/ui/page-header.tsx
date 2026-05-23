import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">{children}</div>}
    </div>
  )
}
