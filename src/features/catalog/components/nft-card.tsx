import { Link } from "@tanstack/react-router";

import { catalogArtworkSizes } from "../../../shared/artwork/artwork-sizes";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { cn } from "../../../shared/lib/cn";
import { FavoriteButton } from "../../favorites/index";
import { type Nft } from "../types/nft";

interface NftCardProps {
  readonly nft: Nft
  readonly index?: number
  readonly presentation?: "catalog" | "related" | "cart-related" | "favorites"
}

const mobileOrders = [
  "",
  "",
  "",
  "max-tablet:order-7 max-tablet:translate-y-0",
  "max-tablet:order-5",
  "max-tablet:order-6",
  "max-tablet:order-4 max-tablet:translate-y-8",
  "max-tablet:order-8",
  "max-tablet:order-9",
]

export function NftCard ({ nft, index = 0, presentation = "catalog" }: NftCardProps) {
  const title = nft.name + " #" + nft.tokenId
  const portrait = nft.id === "cosmic-bloom-118"
  const artOnly = nft.id === "golden-echo-208"
  const related = presentation !== "catalog"

  return (
    <article className={cn("group relative min-w-0", !related && index % 2 === 1 && "max-tablet:translate-y-8", !related && mobileOrders[index])}>
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={"Ver " + title} className={cn(
        "flex h-50 items-start justify-center rounded-[18px] bg-card px-1 pt-3 pb-5",
        "desktop:h-auto desktop:min-h-62.5 desktop:rounded-none desktop:pt-6 desktop:pb-6.5 wide:h-75 wide:min-h-0",

        index === 0 && "desktop:pt-7.75",
        index === 1 && "desktop:pt-6.25",
        portrait && "pt-4 pb-4 desktop:pt-1.5 desktop:pr-3.5 desktop:pb-2 desktop:pl-5",
        artOnly && "desktop:pt-7",
        index >= 6 && "desktop:pt-5",
        !related && index % 2 === 1 && "max-desktop:pt-5",
        related && "desktop:h-63.75 desktop:pt-5 desktop:pb-5.75 wide:h-63.75",
        related && index === 1 && "desktop:pt-6.25",
        related && portrait && "desktop:pt-1 desktop:pr-2.25 desktop:pb-2 desktop:pl-5",
        presentation === "favorites" && "desktop:aspect-square desktop:h-auto desktop:min-h-0 desktop:overflow-hidden desktop:rounded-artwork desktop:p-0 wide:h-auto",
      )}>
        <ArtworkImage
          sizes={related ? presentation === "favorites" ? "300px" : "211px" : catalogArtworkSizes}
          src={nft.image}
          alt=""
          fetchPriority={related ? "auto" : "low"}
          loading={!related && index < 3 ? "eager" : "lazy"}

          className={cn(
            "aspect-square h-auto w-full rounded-artwork object-cover",
            portrait && "h-42 rounded-[13px] desktop:h-71.5",
            related && portrait && "desktop:h-60.75",
            presentation === "favorites" && "desktop:h-full desktop:aspect-square desktop:rounded-none",
          )}
        />
      </Link>

      <FavoriteButton nftId={nft.id} title={title} savedIcon={
        <img className="size-5" src="/assets/d427d.svg" alt="" />
      } className={cn(
        "absolute top-3 right-2.5 size-7 items-center justify-center rounded-full bg-raised desktop:hidden desktop:group-hover:flex desktop:group-focus-within:flex",
        index === 0 ? "flex" : "hidden max-desktop:group-focus-within:flex",
      )}>
        <img src="/assets/364ee.svg" alt="" />
      </FavoriteButton>

      {nft.id === "neon-vessel-552" && (
        <span className="absolute top-4 left-0 bg-primary px-2 py-1.5 text-primary-foreground desktop:hidden">
          RARO
        </span>
      )}

      <div className={cn(
        "flex flex-col gap-1 px-2 pt-2 leading-4 desktop:px-0 desktop:pt-3",
        index < 3 ? "desktop:gap-3" : "desktop:gap-1.5",
        related && "desktop:gap-1",
        artOnly && "desktop:sr-only",
      )}>
        <h3 className={cn(
          "text-[15px] leading-4 font-normal desktop:text-base",
          related && "desktop:text-[15px]",
          presentation === "cart-related" && "desktop:leading-5",
        )}>
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} tabIndex={-1}>{title}</Link>
        </h3>

        <p className={cn("text-base leading-4 whitespace-nowrap desktop:text-lg", related && "desktop:text-base")}>
          <strong className="font-bold text-accent">{nft.editions[0]?.unitPrice} ETH</strong>

          {nft.previousPrice && (
            <span className="hidden pl-3 font-normal text-secondary desktop:inline">
              {nft.previousPrice} ETH
            </span>
          )}
        </p>
      </div>
    </article>
  )
}
