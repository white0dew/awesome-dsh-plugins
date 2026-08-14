import { PluginDirectory } from "@/components/plugin-directory";
import { categories, plugins } from "@/content/plugins.generated";

const sourceLinks = [
  {
    label: "awesome-dsh-plugin/awesome-dsh-plugin",
    href: "https://github.com/awesome-dsh-plugin/awesome-dsh-plugin",
  },
  {
    label: "0xsline/awesome-deepseek-harness",
    href: "https://github.com/0xsline/awesome-deepseek-harness",
  },
  {
    label: "dongsheng123132/awesome-dsh-plugins",
    href: "https://github.com/dongsheng123132/awesome-dsh-plugins",
  },
];

export default function HomePage() {
  const featuredPlugins = plugins.filter((plugin) => plugin.featured);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Awesome DSH Plugins home">
          <span className="brand-mark" aria-hidden="true">
            DSH
          </span>
          <span>Awesome DSH Plugins</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#directory">Directory</a>
          <a href="#sources">Sources</a>
          <a href="#about">About</a>
          <a className="nav-action" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div className="hero-lines" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">DeepSeek Harness plugin radar</p>
          <h1 id="hero-title">Track DeepSeek Harness plugins on GitHub.</h1>
          <p className="hero-copy">
            <strong>Awesome DSH Plugins</strong> is a public <strong>DeepSeek Harness plugin directory</strong> for
            discovering <strong>DSH plugins</strong>, copying install commands, and monitoring the fast-moving GitHub
            ecosystem.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#directory">
              Explore 138 plugins
            </a>
            <a className="text-link" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
              Open the GitHub repository
            </a>
          </div>
        </div>
        <dl className="hero-stats" aria-label="Directory statistics">
          <div>
            <dt>Listed</dt>
            <dd>{plugins.length}</dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>Install-ready</dt>
            <dd>{plugins.length}</dd>
          </div>
        </dl>
      </section>

      <section className="signal-strip" aria-label="Catalog signals">
        <article className="signal-card">
          <p className="signal-kicker">Public GitHub coverage</p>
          <h2 className="signal-value">138 community-listed plugins</h2>
          <p>
            The current launch snapshot is normalized from public ecosystem catalogs so this awesome DSH plugins site can move at GitHub speed.
          </p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">Install flow</p>
          <h2 className="signal-value">One command per listing</h2>
          <p>
            Every card keeps the exact <code>dsh plugin --profile web add github:owner/repo</code> install form for DeepSeek Harness plugins.
          </p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">Contribute</p>
          <h2 className="signal-value">Submit new DSH plugins fast</h2>
          <p>
            Open an issue or pull request on GitHub when you spot a new public repository that belongs in this DeepSeek Harness plugin directory.
          </p>
        </article>
      </section>

      <PluginDirectory featuredPlugins={featuredPlugins} />

      <section id="sources" className="about-section" aria-labelledby="sources-title">
        <div>
          <h2 id="sources-title">Built from live GitHub ecosystem sources.</h2>
        </div>
        <div className="about-copy about-stack">
          <p>
            This site tracks <strong>DeepSeek Harness plugins</strong> as a searchable catalog, not a static README dump.
            The launch snapshot is generated from public GitHub plugin lists and normalized into one schema for names,
            categories, install commands, and provenance.
          </p>
          <ul className="about-list">
            {sourceLinks.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="about" className="about-section" aria-labelledby="about-title">
        <div>
          <h2 id="about-title">Independent, source-linked, and honest about verification.</h2>
        </div>
        <div className="about-copy about-stack">
          <p>
            Awesome DSH Plugins is not an official DeepSeek property. It is an independent GitHub-first index for
            <strong> DeepSeek Harness plugins</strong> and <strong>DSH plugins</strong> that helps builders inspect source,
            compare capabilities, and install public plugins quickly.
          </p>
          <p>
            The default label is <strong>community discovered</strong>. That means a public repository was found and normalized.
            Structural verification is narrower: it only records the presence of expected bundle files and is not a security review,
            compatibility guarantee, or endorsement.
          </p>
          <div className="footer-links">
            <a className="pill-link" href="https://github.com/white0dew/awesome-dsh-plugins/issues/new?template=submit-plugin.yml" target="_blank" rel="noreferrer">
              Submit a plugin
            </a>
            <a className="pill-link" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
              View the repository
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>Awesome DSH Plugins is an independent DeepSeek Harness plugin directory built around public GitHub sources.</p>
        <div className="footer-links">
          <a href="#top">Back to top</a>
          <a href="https://dsh.reshub.vip">dsh.reshub.vip</a>
        </div>
      </footer>
    </main>
  );
}
