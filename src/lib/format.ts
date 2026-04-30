export function formatGTQ(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "\u2014"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (Number.isNaN(num)) return "\u2014"
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(d)
}
