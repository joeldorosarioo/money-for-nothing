import manifest from "./artwork-manifest.json";

interface ArtworkCandidate {
  readonly src: string
  readonly width: number
}

const artwork: Readonly<Record<string, readonly ArtworkCandidate[]>> = manifest

export function artworkSources (src: string, sizes: string) {
  const candidates = artwork[src.replace(/\.png$/, ".webp")]
  if (!candidates) return { src }

  return {
    src, sizes,
    srcSet: candidates.map((candidate) => candidate.src + " " + candidate.width.toString() + "w").join(", "),
  }
}
