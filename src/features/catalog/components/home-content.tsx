import { Link } from "@tanstack/react-router";

import { heroArtworkSizes } from "../../../shared/artwork/artwork-sizes";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { FeatureNotice } from "../../../shared/components/feature-notice";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";
import { Carousel } from "../../../shared/ui/carousel";

const highlights = [
  ["8f387.webp", "Ape com óculos verdes e jaqueta esmeralda"],
  ["83794.webp", "Sage Nomad com chapéu e moletom violeta"],
  ["9add2.webp", "Neon Vessel com jaqueta clara"],
] as const

const articles = [
  ["9add2.webp", "12 de setembro | Leitura de 6 min", "Como funciona a propriedade de NFTs", "Aprenda a colecionar, negociar e verificar ativos digitais."],
  ["8f387.webp", "13 de setembro | Leitura de 2 min", "10 artistas digitais para acompanhar", "Conheça criadores que moldam a cultura digital."],
  ["83794.webp", "15 de setembro | Leitura de 3 min", "Raridade, atributos e procedência", "Entenda raridade, procedência, direitos autorais e utilidade."],
  ["b7cfc.webp", "15 de setembro | Leitura de 2 min", "Como proteger sua carteira", "Proteja sua carteira, seus ativos e sua identidade."],
] as const

export function HomeHero ({ compactCopy = false }: { readonly compactCopy?: boolean }) {
  return (
    <section className={cn(
      "relative mt-4 grid grid-cols-[minmax(0,1fr)_40%] items-center gap-4 rounded-artwork",
      "bg-card bg-[url('/assets/f545d.svg')] bg-cover bg-center bg-no-repeat px-4 py-6",
      "tablet:gap-6 tablet:px-7 tablet:py-8 desktop:mt-8 desktop:min-h-112.5 desktop:grid-cols-[minmax(0,1fr)_42%] desktop:gap-8",
      "desktop:bg-transparent desktop:bg-none desktop:px-0 desktop:py-6 wide:grid-cols-[minmax(0,1fr)_450px]",
      compactCopy && "desktop:mt-3",
    )}>
      <div className="min-w-0 desktop:py-6 desktop:pl-6 wide:pl-10">
        <p className="mb-2 text-[13px] leading-5 font-medium desktop:mb-3 desktop:text-sm desktop:font-bold">
          Bem-vindo à Kurio
        </p>

        <h1 className="mb-3 text-[clamp(1rem,4.6vw,1.75rem)] leading-snug font-bold desktop:mb-6 desktop:text-4xl desktop:leading-14 wide:text-[43px] wide:leading-16">
          <span className="hidden desktop:block">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span>
          <span className="block desktop:hidden">SEJA DONO DA<br />CULTURA DIGITAL</span>
        </h1>

        {compactCopy ? (
          <p className="hidden max-w-130 text-sm leading-6 text-secondary desktop:block">
            Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital verificada.
          </p>
        ) : (
          <p className="hidden max-w-130 text-sm leading-6 text-secondary desktop:block">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
        )}

        <p className="block text-sm leading-6 text-muted-foreground tablet:max-w-70 desktop:hidden">
          Descubra NFTs selecionados de criadores do mundo todo.
        </p>

        <a href="#catalogo" className="mt-4 inline-flex min-h-11 items-center justify-start gap-2 rounded-control text-sm font-bold text-accent desktop:mt-8 desktop:min-w-35 desktop:justify-center desktop:bg-primary desktop:px-5 desktop:text-base desktop:font-medium desktop:text-primary-foreground hover:underline underline-offset-4">
          <span>EXPLORAR</span>
          <img className="block -rotate-90 desktop:hidden" src="/assets/bf307.svg" alt="" />
        </a>
      </div>

      <Carousel
        label="Destaques da coleção"
        controlsClassName="absolute bottom-[5.5px] left-1/2 mt-0 h-1.75 -translate-x-1/2 gap-1.5 desktop:bottom-11.25 desktop:left-150 desktop:h-2 desktop:translate-x-0 desktop:gap-1.75"
        indicatorClassName="size-1.75 border-0 bg-panel-border desktop:size-2 desktop:bg-primary"
      >
        {highlights.map(([asset, alt], index) => (
          <div className="relative" key={asset}>
            <ArtworkImage
              className="aspect-square h-auto w-full rounded-artwork object-cover"
              sizes={heroArtworkSizes}
              src={"/assets/" + asset}
              alt={alt}
              deferUntilVisible={index > 0}
              fetchPriority={index === 0 ? "high" : "low"}
            />
            {index === 0 && (
              <ArtworkImage
                sizes="58px"
                className="absolute bottom-3 left-3 size-14.5 rounded-control border-4 border-card object-cover desktop:hidden"
                src="/assets/83794.webp"
                alt=""
                fetchPriority="low"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </Carousel>
    </section>
  )
}

export function HomeEditorial () {
  return (
    <div className="mt-section hidden desktop:block">
      <section className="grid grid-cols-2 gap-8" id="criadores" aria-label="Coleções selecionadas">
        <div className="grid min-w-0 grid-cols-[40%_minmax(0,1fr)] overflow-hidden rounded-artwork bg-card">
          <div className="relative min-h-64">
            <ArtworkImage
              deferUntilVisible
              sizes="(min-width: 1331px) 235px, 19vw"
              className="absolute inset-0 h-full w-full object-cover"
              src="/assets/8f387.webp"
              alt=""
              loading="lazy"
            />
            <img className="pointer-events-none absolute inset-0 h-full w-full object-cover" src="/assets/68d8c.svg" alt="" />
          </div>

          <div className="flex min-w-0 flex-col items-start gap-4 p-6">
            <h2 className="text-lg leading-6 font-bold">
              Lançamentos gênesis<br />de edição limitada
            </h2>

            <p className="text-sm leading-6 text-muted-foreground">
              Colecione edições escassas diretamente dos criadores antes da revelação pública.
            </p>

            <Button className="mt-auto min-h-11 text-sm" asChild>
              <Link to="/" search={{ sort: "recent", page: 1 }} hash="catalogo">
                Explorar →
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[40%_minmax(0,1fr)] overflow-hidden rounded-artwork bg-card">
          <div className="relative min-h-64">
            <ArtworkImage
              deferUntilVisible
              sizes="(min-width: 1331px) 235px, 19vw"
              className="absolute inset-0 h-full w-full object-cover"
              src="/assets/9add2.webp"
              alt=""
              loading="lazy"
            />
            <img className="pointer-events-none absolute inset-0 h-full w-full object-cover" src="/assets/68d8c.svg" alt="" />
          </div>

          <div className="flex min-w-0 flex-col items-start gap-4 p-6">
            <h2 className="text-lg leading-6 font-bold">
              Arte digital selecionada<br />e muito mais
            </h2>

            <p className="text-sm leading-6 text-muted-foreground">
              Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.
            </p>

            <Button className="mt-auto min-h-11 text-sm" asChild>
              <Link to="/" search={{ categories: ["digital-art"], page: 1 }} hash="catalogo">
                Explorar →
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-section" id="diario">
        <h2 className="text-center text-[28px] leading-8 font-bold">Diário da Cunhagem</h2>

        <p className="mt-4 text-center text-sm text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>

        <div className="mt-8 grid grid-cols-4 gap-6">
          {articles.map(([asset, meta, title, description]) => (
            <article className="flex min-w-0 flex-col overflow-hidden rounded-artwork bg-card" key={title}>
              <ArtworkImage
                deferUntilVisible
                sizes="(min-width: 1331px) 282px, 22vw"
                className="aspect-[4/3] h-auto w-full object-cover"
                src={"/assets/" + asset}
                alt=""
                loading="lazy"
              />

              <div className="flex flex-1 flex-col gap-4 p-4 text-sm leading-6 text-muted-foreground">
                <p className="text-xs leading-5">{meta}</p>
                <h3 className="text-base leading-[normal] font-bold text-foreground">{title}</h3>
                <p>{description}</p>

                <FeatureNotice title={title}>
                  <button className="mt-auto min-h-11 self-start text-left font-bold text-accent hover:underline underline-offset-4">
                    Ler mais
                  </button>
                </FeatureNotice>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
