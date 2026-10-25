export function formatReceiptDate (timestamp: number) {
  const parts = new Intl
    .DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .formatToParts(timestamp)

  const day = parts.find((part) => part.type === "day")?.value ?? ""
  const month = parts.find((part) => part.type === "month")?.value.replace(".", "") ?? ""
  const year = parts.find((part) => part.type === "year")?.value ?? ""

  return day + " " + month + ", " + year
}
