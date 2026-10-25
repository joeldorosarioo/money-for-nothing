import { Link } from "@tanstack/react-router";

import { heroArtworkSizes } from "../../../shared/artwork/artwork-sizes";
import { ArtworkImage } from "../../../shared/components/artwork-image";
import { FeatureNotice } from "../../../shared/components/feature-notice";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/button";

const articles = [
  ["9add2.webp", "12 de setembro | Leitura de 6 min", "Como funciona a propriedade de NFTs", "Aprenda a colecionar, negociar e verificar ativos digitais."],
  ["8f387.webp", "13 de setembro | Leitura de 2 min", "10 artistas digitais para acompanhar", "Conheça criadores que moldam a cultura digital."],
  ["83794.webp", "15 de setembro | Leitura de 3 min", "Raridade, atributos e procedência", "Entenda raridade, procedência, direitos autorais e utilidade."],
  ["b7cfc.webp", "15 de setembro | Leitura de 2 min", "Como proteger sua carteira", "Proteja sua carteira, seus ativos e sua identidade."],
] as const

export function HomeHero ({ compactCopy = false }: { readonly compactCopy?: boolean }) {
  return (
    <section className={cn(
      "relative mt-4 flex h-47.5 items-start justify-between gap-2 overflow-hidden rounded-[20px]",
      "bg-card bg-[url('/assets/f545d.svg')] bg-cover bg-center bg-no-repeat px-4 pt-[5.5px]",
      "tablet:h-65 tablet:pt-5 desktop:mt-8 desktop:h-112.5 desktop:items-stretch desktop:gap-0",
      "desktop:overflow-visible desktop:rounded-none desktop:bg-transparent desktop:bg-none desktop:p-0",
      compactCopy && "desktop:mt-3 desktop:translate-x-1.25",
    )}>
      <div className="w-14/25 flex-1 p-0 tablet:pt-3 desktop:w-187.5 desktop:flex-initial desktop:p-10 desktop:pl-6 wide:pl-10">
        <p className={cn(
          "mb-1.5 text-xs leading-4 font-medium desktop:mb-2 desktop:text-sm desktop:font-bold",
          compactCopy && "desktop:absolute desktop:top-17 desktop:left-10.75",
        )}>
          Bem-vindo à Kurio
        </p>

        <h1 className={cn(
          "mb-2.5 text-lg leading-6.75 font-bold tablet:text-[28px] desktop:mb-7 desktop:text-4xl desktop:leading-15 wide:text-[43px] wide:leading-17.5",
          compactCopy && "desktop:absolute desktop:top-22.75 desktop:left-10",
        )}>
          <span className="hidden desktop:block">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span>
          <span className="block desktop:hidden">SEJA DONO DA<br />CULTURA DIGITAL</span>
        </h1>

        {compactCopy ? (
          <p className="hidden text-sm leading-4.5 text-secondary desktop:block desktop:[&_br]:hidden wide:[&_br]:block desktop:absolute desktop:top-59 desktop:left-10.75 desktop:max-w-130 desktop:leading-6">
            Descubra NFTs selecionados de criadores do mundo todo e colecione arte digital verificada.
          </p>
        ) : (
          <p className="hidden text-sm leading-4.5 text-secondary desktop:block desktop:[&_br]:hidden wide:[&_br]:block">
            Descubra NFTs selecionados de criadores emergentes e consagrados.<br />
            Colecione arte digital rara, apoie artistas e tenha uma parte da<br />cultura da internet.
          </p>
        )}

        <p className="block text-xs leading-4.5 text-secondary tablet:max-w-70 tablet:text-sm desktop:hidden">
          Descubra NFTs selecionados de criadores do mundo todo.
        </p>

        <a href="#catalogo" className={cn(
          "mt-0 inline-flex h-4 w-auto items-center justify-start gap-2 rounded-[5px] bg-transparent text-xs font-bold text-accent",
          "desktop:mt-12 desktop:h-10 desktop:w-35 desktop:justify-center desktop:gap-0 desktop:bg-primary desktop:text-base desktop:font-medium desktop:text-primary-foreground",
          compactCopy && "desktop:absolute desktop:top-81.25 desktop:left-10.25 desktop:mt-0",
        )}>
          <span>EXPLORAR</span>
          <img className="block -rotate-90 desktop:hidden" src="/assets/bf307.svg" alt="" />
        </a>
      </div>

      <div className="relative mt-1.25 h-36.5 w-413/1000 shrink-0 tablet:size-55 desktop:mt-0 desktop:size-100 wide:size-112.5">
        <ArtworkImage
          className="aspect-square h-auto w-full rounded-[20px] object-cover desktop:size-100 desktop:rounded-[25px] wide:size-112.5"
          sizes={heroArtworkSizes}
          src="/assets/8f387.webp"
          alt="Ape com óculos verdes e jaqueta esmeralda"
          fetchPriority="high"
        />

        <ArtworkImage
          sizes="58px"
          className="absolute top-22 left-3.5 size-14.5 rounded-xl object-cover tablet:top-35 desktop:hidden"
          src="/assets/83794.webp"
          alt=""
          fetchPriority="low"
          loading="lazy"
        />
      </div>

      <div className={cn(
        "absolute bottom-[5.5px] left-1/2 flex -translate-x-1/2 gap-1.5",
        "desktop:bottom-11.25 desktop:left-150 desktop:translate-x-0 desktop:gap-1.75",
        "[&_i]:size-1.75 [&_i]:rounded-full [&_i]:bg-panel-border [&_i:first-child]:bg-primary",
        "desktop:[&_i]:size-2 desktop:[&_i]:bg-primary",
      )} aria-hidden="true"><i /><i /><i /></div>
    </section>
  )
}

export function HomeEditorial () {
  return (
    <div className="mt-24 hidden desktop:block">
      <section className="grid grid-cols-2 gap-7" id="criadores" aria-label="Coleções selecionadas">
        <div className="relative flex h-62.5 overflow-hidden rounded-lg bg-card">
          <ArtworkImage
            deferUntilVisible
            sizes="287px"
            className="w-9/20 rounded-[20px] object-cover wide:w-71.75"
            src="/assets/8f387.webp"
            alt=""
            loading="lazy"
          />

          <div className="absolute inset-y-0 right-7.5 left-73.25 text-right">
            <h2 className="absolute top-9.25 right-0 text-lg leading-6 font-bold whitespace-nowrap">
              Lançamentos gênesis<br />de edição limitada
            </h2>

            <p className="absolute top-23.5 right-0 text-sm leading-6 text-muted-foreground">
              Colecione edições escassas diretamente dos criadores antes da revelação pública.
            </p>

            <Button className="absolute top-41 right-0 h-10 w-35 text-sm" asChild>
              <Link to="/" search={{ sort: "recent", page: 1 }} hash="catalogo">
                Explorar →
              </Link>
            </Button>
          </div>

          <img
            className="pointer-events-none absolute top-0 left-0 w-9/20 rounded-[20px] object-cover wide:w-71.75"
            src="/assets/68d8c.svg" alt=""
          />
        </div>

        <div className="relative flex h-62.5 overflow-hidden rounded-lg bg-card">
          <ArtworkImage
            deferUntilVisible
            sizes="287px"
            className="w-9/20 rounded-[20px] object-cover wide:w-71.75"
            src="/assets/9add2.webp"
            alt=""
            loading="lazy"
          />

          <div className="absolute inset-y-0 right-8.75 left-73.75 text-right">
            <h2 className="absolute top-9.25 right-0 text-lg leading-6 font-bold whitespace-nowrap">
              Arte digital selecionada<br />e muito mais
            </h2>

            <p className="absolute top-23.5 right-1 text-sm leading-6 text-muted-foreground">
              Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.
            </p>

            <Button className="absolute top-41 right-0 h-10 w-35 text-sm" asChild>
              <Link to="/" search={{ categories: ["digital-art"], page: 1 }} hash="catalogo">
                Explorar →
              </Link>
            </Button>
          </div>

          <img
            className="pointer-events-none absolute top-0 left-0 w-9/20 rounded-[20px] object-cover wide:w-71.75"
            src="/assets/68d8c.svg" alt=""
          />
        </div>
      </section>

      <section className="mt-24" id="diario">
        <h2 className="text-center text-[28px] leading-8 font-bold">Diário da Cunhagem</h2>

        <p className="mt-4 text-center text-sm text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>

        <div className="mt-10 grid grid-cols-[repeat(4,268px)] gap-6">
          {articles.map(([asset, meta, title, description]) => (
            <article className="overflow-hidden rounded-[5px] bg-card" key={title}>
              <ArtworkImage
                deferUntilVisible
                sizes="268px"
                className="h-48.75 w-full object-cover"
                src={"/assets/" + asset}
                alt=""
                loading="lazy"
              />

              <div className="flex flex-col gap-2 px-4 pt-3 pb-4 text-xs leading-4 font-medium text-muted-foreground">
                <p className="text-xs leading-4">{meta}</p>
                <h3 className="text-base leading-[normal] font-bold text-foreground">{title}</h3>
                <p>{description}</p>

                <FeatureNotice title={title}>
                  <button className="self-start text-left leading-4 font-bold text-accent">
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
