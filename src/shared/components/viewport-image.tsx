import { useCallback, type ComponentProps } from "react";

type ViewportImageProps = Omit<ComponentProps<"img">, "src" | "ref"> & {
  readonly src: string
}

export function ViewportImage ({ src, srcSet, sizes, ...props }: ViewportImageProps) {
  const observeImage = useCallback((image: HTMLImageElement | null) => {
    if (!image) return

    function loadImage () {
      if (!image) return
      if (sizes) image.sizes = sizes
      else image.removeAttribute("sizes")
      if (srcSet) image.srcset = srcSet
      else image.removeAttribute("srcset")

      image.src = src
    }

    if (typeof IntersectionObserver === "undefined") {
      loadImage();
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadImage();
        observer.disconnect();
      }
    }, { rootMargin: "200px" });

    observer.observe(image);
    return () => { observer.disconnect() };
  }, [src, srcSet, sizes]);

  return <img {...props} ref={observeImage} loading="lazy" />
}
