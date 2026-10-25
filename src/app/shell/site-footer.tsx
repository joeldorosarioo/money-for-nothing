import { Link } from "@tanstack/react-router";

import { normalizeCatalogSearch } from "../../features/catalog/index";
import { FeatureNotice } from "../../shared/components/feature-notice";
import { WalletBrands } from "../../shared/components/wallet-brands";
import { Button } from "../../shared/ui/button";

const benefits = [
  ["W", "Segurança da carteira", "Proteja sua carteira e colecione arte digital verificada com confiança."],
  ["C", "Criadores em destaque", "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede."],
  ["D", "Alertas de lançamentos", "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado."],
] as const

const supportLinks = [
  "Central de ajuda",
  "Como comprar NFTs",
  "Carteira e segurança",
  "Política do mercado",
  "Denunciar item"
]

const profileLinks = [
  "Minha coleção",
  "Atividade",
  "Estúdio do criador",
  "Lista de interesse"
]

const collections = [
  ["Arte digital", "digital-art"],
  ["Fotografia", "photography"],
  ["Música", "music"],
  ["Arte 3D", "3d"],
  ["Utilidade", "utility"],
] as const

const socials = [
  ["Facebook", "99280.svg"],
  ["Instagram", "d48dd.svg"],
  ["Twitter", "b4111.svg"],
  ["LinkedIn", "b8b84.svg"],
  ["YouTube", "ca2da.svg"],
] as const

export function SiteFooter () {
  return (
    <footer className="mt-24 hidden desktop:block" id="rodape">
      <div className="min-h-143.5 bg-card">
        <div className="grid min-h-62.5 grid-cols-[repeat(3,minmax(0,264.6667fr))_minmax(0,357fr)] gap-px pt-8 pr-3.5 pb-4 pl-8">
          {benefits.map(([letter, title, description]) => (
            <section key={title} className="relative px-4 after:absolute after:top-0 after:-right-px after:h-50.5 after:w-px after:bg-primary after:content-['']">
              <span className="flex size-18.5 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground" aria-hidden="true">
                {letter}
              </span>

              <h3 className="mt-3 mb-2 text-[17px] leading-5 font-bold wide:whitespace-nowrap">{title}</h3>
              <p className="w-51 max-w-full text-sm leading-5.5 text-muted-foreground">{description}</p>
            </section>
          ))}

          <section className="px-4">
            <h3 className="text-lg leading-6 font-bold">Antecipe-se ao próximo lançamento</h3>

            <FeatureNotice title="Alertas de lançamentos">
              <Button className="min-h-10 w-full justify-between bg-card p-0" variant="ghost">
                <span className="pl-2.75 text-sm font-normal text-secondary">digite seu e-mail...</span>
                <strong className="h-10 bg-primary px-3.75 py-2 text-lg text-primary-foreground">Enviar</strong>
              </Button>
            </FeatureNotice>

            <p className="mt-3 text-[13px] leading-4.5 text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades.
            </p>
          </section>
        </div>

        <div className="grid h-22 grid-cols-[repeat(3,minmax(0,1fr))_228px] items-center gap-x-6 p-8 text-sm wide:gap-x-23">
          <Link to="/" search={normalizeCatalogSearch({})} className="inline-flex min-h-8.5 items-center text-sm font-bold tracking-widest">
            KURIO
          </Link>

          <p className="whitespace-nowrap leading-5.5">Feito para colecionadores,<br />criadores e cultura</p>
          <a href="mailto:contato@email.com">contato@email.com</a><a href="tel:+551140028922">+55 11 4002 8922</a>
        </div>

        <div className="grid min-h-59 grid-cols-[repeat(3,minmax(0,1fr))_228px] gap-x-6 p-8 text-sm leading-7.5 wide:gap-x-23 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:leading-4 [&_h3]:font-bold [&_section>a]:block [&_section>a]:text-left [&_section>button]:block [&_section>button]:text-left">
          <section>
            <h3>Meu perfil</h3>
            <Link to="/profile">Meu perfil</Link>

            {profileLinks.map((label) => (
              <FeatureNotice key={label} title={label}>
                <button>{label}</button>
              </FeatureNotice>
            ))}
          </section>

          <section>
            <h3>Central de ajuda</h3>

            {supportLinks.map((label) => (
              <FeatureNotice key={label} title={label}>
                <button>{label}</button>
              </FeatureNotice>
            ))}
          </section>

          <section>
            <h3>Coleções</h3>

            {collections.map(([label, category]) => (
              <Link key={category} to="/" search={normalizeCatalogSearch({ categories: [category] })}>
                {label}
              </Link>
            ))}
          </section>

          <section>
            <h3>Redes sociais</h3>

            <div className="mt-3 mb-8 flex gap-2.5">
              {socials.map(([label, asset]) => (
                <FeatureNotice key={label} title={label}>
                  <button aria-label={label}>
                    <img src={"/assets/" + asset} alt="" />
                  </button>
                </FeatureNotice>
              ))}
            </div>

            <h3>Carteiras compatíveis</h3>
            <WalletBrands className="mt-2" />
          </section>
        </div>
      </div>

      <p className="mt-4 text-center text-sm leading-5">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
