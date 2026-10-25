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

export function NftCard ({ nft, index = 0, presentation = "catalog" }: NftCardProps) {
  const title = nft.name + " #" + nft.tokenId
  const related = presentation !== "catalog"

  return (
    <article className="group relative min-w-0">
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={"Ver " + title} className={cn(
        "block overflow-hidden rounded-artwork bg-card p-2 transition-colors hover:bg-raised focus-visible:-outline-offset-4",
        presentation === "favorites" && "p-0 tablet:p-0",
      )}>
        <ArtworkImage
          sizes={related ? presentation === "favorites" ? "300px" : "(min-width: 1331px) 204px, calc((100vw - 232px) / 5)" : catalogArtworkSizes}
          src={nft.image}
          alt=""
          fetchPriority={related ? "auto" : "low"}
          loading={!related && index < 3 ? "eager" : "lazy"}

          className="aspect-square h-auto w-full rounded-artwork object-cover"
        />
      </Link>

      <FavoriteButton nftId={nft.id} title={title} savedIcon={
        <img className="size-5" src="/assets/d427d.svg" alt="" />
      } className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-raised text-accent">
        <img src="/assets/364ee.svg" alt="" />
      </FavoriteButton>

      {nft.id === "neon-vessel-552" && (
        <span className="absolute top-3 left-1.5 rounded-control bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
          RARO
        </span>
      )}

      <div className="flex flex-col gap-1 px-1 pt-3 leading-5">
        <h3 className="min-h-10 wrap-break-word text-sm leading-5 font-medium desktop:text-base">
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} tabIndex={-1}>{title}</Link>
        </h3>

        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base leading-6 tabular-nums">
          <strong className="font-bold text-accent">{nft.editions[0]?.unitPrice} ETH</strong>

          {nft.previousPrice && (
            <span className="text-xs font-normal text-secondary line-through">
              {nft.previousPrice} ETH
            </span>
          )}
        </p>
      </div>
    </article>
  )
}
