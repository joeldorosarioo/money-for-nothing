const WEI_PER_ETH = 10n ** 18n
const ETH_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,18}))?$/

export function parseEth (value: string): bigint {
  if (value.length > 80 || !ETH_PATTERN.test(value))
    throw new RangeError("ETH amounts must be non-negative decimal strings with at most 18 decimal places.");

  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(18, "0"));
}

export function formatEth (value: bigint): string {
  if (value < 0n) throw new RangeError("ETH amounts cannot be negative.");

  const whole = value / WEI_PER_ETH
  const fraction = (value % WEI_PER_ETH).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function sumEth (values: readonly string[]): string {
  return formatEth(values.reduce((total, value) => total + parseEth(value), 0n));
}

export function multiplyEth (value: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new RangeError("Quantities must be non-negative safe integers.");

  return formatEth(parseEth(value) * BigInt(quantity));
}

export function calculateDiscount (value: string, basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000)
    throw new RangeError("Discounts must be whole basis points between zero and ten thousand.");

  return formatEth(parseEth(value) * BigInt(basisPoints) / 10000n);
}
