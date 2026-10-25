import { describe, expect, it } from "vitest";

import { calculateDiscount, formatEth, multiplyEth, parseEth, sumEth } from "./eth";

describe("ETH precision", () => {
  it.each([
    ["0", 0n],
    ["1.19", 1190000000000000000n],
    ["0.000000000000000001", 1n],
    ["12345678901234567890.123456789012345678", 12345678901234567890123456789012345678n],
  ])("parses %s without floating-point loss", (input, expected) => {
    expect(parseEth(input)).toBe(expected);
  });

  it.each(
    ["-1", "1e3", "NaN", "1,19", ".5", "01", " 1 ", "0.0000000000000000001"]
  )("rejects the invalid transport value %s", (input) => {
    expect(() => parseEth(input)).toThrow();
  });

  it.each([
    [0n, "0"],
    [1n, "0.000000000000000001"],
    [1190000000000000000n, "1.19"],
    [10000000000000000000n, "10"],
  ])("formats %s as an exact decimal", (input, expected) => {
    expect(formatEth(input)).toBe(expected);
  });

  it("rejects negative monetary amounts", () => {
    expect(() => formatEth(-1n)).toThrow();
  });

  it("sums decimal values exactly", () => {
    expect(sumEth(["0.1", "0.2", "0.000000000000000001"])).toBe("0.300000000000000001");
  });

  it("multiplies a unit price by an integer quantity", () => {
    expect(multiplyEth("1.19", 3)).toBe("3.57");
  });

  it.each(
    [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]
  )("rejects the invalid quantity %s", (quantity) => {
    expect(() => multiplyEth("1.19", quantity)).toThrow();
  });

  it("rounds a percentage discount down to a whole wei", () => {
    expect(calculateDiscount("0.000000000000000019", 1000)).toBe("0.000000000000000001");
  });

  it.each([-1, 10001, 1.5])("rejects the invalid percentage %s", (basisPoints) => {
    expect(() => calculateDiscount("1", basisPoints)).toThrow();
  });
});
