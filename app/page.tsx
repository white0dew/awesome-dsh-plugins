import { PluginDirectory } from "@/components/plugin-directory";
import { categories, plugins } from "@/content/plugins.generated";

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
          <a href="#about">About</a>
          <a
            className="nav-action"
            href="https://github.com/white0dew/awesome-dsh-plugins"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div className="hero-lines" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">DeepSeek Harness plugin directory</p>
          <h1 id="hero-title">Find DeepSeek Harness plugins on GitHub.</h1>
          <p className="hero-copy">
            <strong>Awesome DSH Plugins</strong> helps builders discover <strong>DSH plugins</strong>, inspect their
            original GitHub repositories, and copy direct install commands.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#directory">
              Explore {plugins.length} plugins
            </a>
            <a
              className="text-link"
              href="https://github.com/white0dew/awesome-dsh-plugins"
              target="_blank"
              rel="noreferrer"
            >
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
          <p className="signal-kicker">Original repositories</p>
          <h2 className="signal-value">{plugins.length} community-listed plugins</h2>
          <p>Every card links directly to the plugin&apos;s original GitHub repository, not an intermediary directory.</p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">Install flow</p>
          <h2 className="signal-value">One command per listing</h2>
          <p>
            Every card keeps the exact <code>dsh plugin --profile web add github:owner/repo</code> install form.
          </p>
        </article>
        <article className="signal-card">
          <p className="signal-kicker">Contribute</p>
          <h2 className="signal-value">Keep the directory current</h2>
          <p>Open an issue or pull request when you find a public repository that belongs in the directory.</p>
        </article>
      </section>

      <PluginDirectory featuredPlugins={featuredPlugins} />

      <section id="about" className="about-section" aria-labelledby="about-title">
        <div>
          <h2 id="about-title">Independent, direct, and honest about verification.</h2>
        </div>
        <div className="about-copy about-stack">
          <p>
            Awesome DSH Plugins is not an official DeepSeek property. It is an independent GitHub-first index for
            <strong> DeepSeek Harness plugins</strong> that helps builders compare capabilities and inspect the original
            repositories before installing.
          </p>
          <p>
            The default label is <strong>community discovered</strong>: an original GitHub repository was indexed. It is
            not a security review, compatibility guarantee, quality rating, or endorsement.
          </p>
          <div className="footer-links">
            <a
              className="pill-link"
              href="https://github.com/white0dew/awesome-dsh-plugins/issues/new?template=submit-plugin.yml"
              target="_blank"
              rel="noreferrer"
            >
              Submit a plugin
            </a>
            <a
              className="pill-link"
              href="https://github.com/white0dew/awesome-dsh-plugins"
              target="_blank"
              rel="noreferrer"
            >
              View the repository
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>Awesome DSH Plugins is an independent DeepSeek Harness plugin directory built around original GitHub repositories.</p>
        <div className="footer-links">
          <a href="#top">Back to top</a>
          <a href="https://dsh.reshub.vip">dsh.reshub.vip</a>
        </div>
      </footer>
    </main>
  );
}
