"use client";

import Image from "next/image";
import { LocaleControl, useLocale } from "@/components/locale-provider";
import { PluginDirectory } from "@/components/plugin-directory";
import { categories, plugins, type Plugin } from "@/content/plugins.generated";

type HomeShellProps = {
  featuredPlugins: readonly Plugin[];
};

export function HomeShell({ featuredPlugins }: HomeShellProps) {
  const { text } = useLocale();

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={text.brandAria}>
          <Image className="brand-icon" src="/deepseek-icon.ico" width={34} height={34} alt="" priority />
          <span className="brand-name">Awesome DSH Plugins</span>
          <span className="brand-divider" aria-hidden="true" />
          <Image className="brand-wordmark" src="/deepseek-wordmark.png" width={69} height={15} alt="DeepSeek" />
          <span className="brand-note">{text.independent}</span>
        </a>
        <div className="topbar-actions">
          <nav className="topnav" aria-label={text.brandAria}>
            <a href="#directory">{text.directory}</a>
            <a href="#about">{text.about}</a>
            <a href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
              {text.github}
            </a>
          </nav>
          <LocaleControl />
        </div>
      </header>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 id="hero-title">{text.heroTitle}</h1>
          <p className="hero-copy">{text.heroCopy}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#directory">
              {text.explore}
            </a>
            <a className="text-link" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
              {text.openRepository}
            </a>
          </div>
        </div>
        <dl className="hero-stats" aria-label={text.directory}>
          <div>
            <dt>{text.listed}</dt>
            <dd>{plugins.length}</dd>
          </div>
          <div>
            <dt>{text.categories}</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>{text.directRepos}</dt>
            <dd>{plugins.length}</dd>
          </div>
        </dl>
      </section>

      <section className="signal-strip" aria-label={text.directory}>
        <article className="signal-card">
          <p className="signal-kicker">{text.directLabel}</p>
          <h2 className="signal-value">{text.directValue}</h2>
          <p>{text.directCopy}</p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">{text.installLabel}</p>
          <h2 className="signal-value">{text.installValue}</h2>
          <p>{text.installCopy}</p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">{text.independentLabel}</p>
          <h2 className="signal-value">{text.independentValue}</h2>
          <p>{text.independentCopy}</p>
        </article>
      </section>

      <PluginDirectory featuredPlugins={featuredPlugins} />

      <section id="about" className="about-section" aria-labelledby="about-title">
        <div>
          <p className="eyebrow">{text.about}</p>
          <h2 id="about-title">{text.aboutTitle}</h2>
        </div>
        <div className="about-copy about-stack">
          <p>{text.aboutCopy}</p>
          <p>{text.aboutNote}</p>
          <div className="footer-links">
            <a className="pill-link" href="https://github.com/white0dew/awesome-dsh-plugins/issues/new?template=submit-plugin.yml" target="_blank" rel="noreferrer">
              {text.submitPlugin}
            </a>
            <a className="pill-link" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
              {text.viewProject}
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>{text.footer}</p>
        <div className="footer-links">
          <a href="#top">{text.backToTop}</a>
          <a href="https://dsh.reshub.vip">dsh.reshub.vip</a>
        </div>
      </footer>
    </main>
  );
}
