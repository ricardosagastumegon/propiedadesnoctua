export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const str = cell == null ? "" : String(cell)
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(",")
    )
    .join("\n")
}

export function csvDataUrl(content: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`
}
