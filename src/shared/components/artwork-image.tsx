import { type ComponentProps } from "react";

import { artworkSources } from "../artwork/artwork-sources";
import { ViewportImage } from "./viewport-image";

type ArtworkImageProps = Omit<ComponentProps<"img">, "src" | "srcSet" | "sizes"> & {
  readonly src: string
  readonly sizes: string
  readonly deferUntilVisible?: boolean
}

export function ArtworkImage ({ src, sizes, deferUntilVisible = false, ...props }: ArtworkImageProps) {
  const sources = artworkSources(src, sizes)
  return deferUntilVisible ? <ViewportImage {...props} {...sources} /> : <img {...props} {...sources} />
}
