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
    <footer className="mt-section hidden desktop:block" id="rodape">
      <div className="rounded-artwork bg-card">
        <div className="grid grid-cols-2 gap-6 wide:p-8 p-6 wide:p-8 wide:grid-cols-4 wide:gap-6">
          {benefits.map(([letter, title, description]) => (
            <section key={title} className="min-w-0">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden="true">
                {letter}
              </span>

              <h3 className="mt-4 mb-2 text-base leading-6 font-bold">{title}</h3>
              <p className="max-w-80 text-sm leading-6 text-muted-foreground">{description}</p>
            </section>
          ))}

          <section className="min-w-0">
            <h3 className="text-lg leading-6 font-bold">Antecipe-se ao próximo lançamento</h3>

            <FeatureNotice title="Alertas de lançamentos">
              <Button className="mt-3 min-h-11 w-full justify-between gap-2 border-panel-border bg-card p-0 whitespace-normal" variant="ghost">
                <span className="min-w-0 pl-3 text-left text-sm font-normal text-secondary">digite seu e-mail...</span>
                <strong className="flex min-h-11 shrink-0 items-center bg-primary px-3 text-sm text-primary-foreground">Enviar</strong>
              </Button>
            </FeatureNotice>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades.
            </p>
          </section>
        </div>

        <div className="grid grid-cols-2 items-center gap-x-8 gap-y-4 border-y border-border p-6 wide:p-8 text-sm wide:grid-cols-4">
          <Link to="/" search={normalizeCatalogSearch({})} className="inline-flex min-h-11 items-center text-sm font-bold tracking-widest">
            KURIO
          </Link>

          <p className="leading-6">Feito para colecionadores,<br />criadores e cultura</p>
          <a className="inline-flex min-h-11 items-center break-all" href="mailto:contato@email.com">contato@email.com</a><a className="inline-flex min-h-11 items-center" href="tel:+551140028922">+55 11 4002 8922</a>
        </div>

        <div className="grid grid-cols-2 gap-6 wide:p-8 p-6 wide:p-8 text-sm leading-6 wide:grid-cols-4 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:leading-6 [&_h3]:font-bold [&_section]:min-w-0 [&_section>a]:flex [&_section>a]:min-h-11 [&_section>a]:items-center [&_section>a]:text-left [&_section>button]:block [&_section>button]:min-h-11 [&_section>button]:text-left [&_a:hover]:text-accent [&_button:hover]:text-accent">
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

            <div className="mt-3 mb-8 flex flex-wrap gap-2">
              {socials.map(([label, asset]) => (
                <FeatureNotice key={label} title={label}>
                  <button className="flex size-11 items-center justify-center rounded-control hover:bg-raised" aria-label={label}>
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
