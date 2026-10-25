import { calculateDiscount, formatEth, multiplyEth, parseEth, sumEth } from "../../../shared/money/eth";

import { type QuoteTotals } from "../types/quote";

export function calculateQuoteTotals (
  items: readonly {
    readonly unitPrice: string;
    readonly quantity: number
  }[],

  discountBasisPoints: number,
  networkFee: string,
): QuoteTotals {
  const subtotal = sumEth(items.map((item) => multiplyEth(item.unitPrice, item.quantity)))
  const discount = calculateDiscount(subtotal, discountBasisPoints)
  const appliedFee = items.length > 0 ? networkFee : "0"
  const total = formatEth(parseEth(subtotal) - parseEth(discount) + parseEth(appliedFee))

  return { subtotal, discount, networkFee: appliedFee, total }
}
