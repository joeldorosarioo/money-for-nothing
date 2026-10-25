import { type CSSProperties } from "react";

interface PurchaseArtworkStyle extends CSSProperties {
  readonly "--purchase-art-size": string
  readonly "--purchase-art-x": string
  readonly "--purchase-title-x": string
  readonly "--purchase-quantity-x": string
  readonly "--purchase-subtotal-x": string
}

export function purchaseArtworkStyle (nftId: string, receipt: boolean): PurchaseArtworkStyle {
  const violet = nftId.startsWith("violet-nomad")
  const ivory = nftId.startsWith("ivory-baron")
  const size = violet ? 66 : ivory ? 65 : 70

  return {
    "--purchase-art-size": size.toString() + "px",
    "--purchase-art-x": (receipt ? 0 : violet ? 5 : ivory ? 6 : 3).toString() + "px",
    "--purchase-title-x": (receipt ? size + 12 : violet ? 75 : 80).toString() + "px",
    "--purchase-quantity-x": (receipt ? violet ? 303 : ivory ? 306 : 301 : violet || ivory ? 243 : 241).toString() + "px",
    "--purchase-subtotal-x": (receipt ? violet ? 394 : ivory ? 397 : 392 : ivory ? 292 : 303).toString() + "px",
  }
}
