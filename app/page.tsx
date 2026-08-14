import { PluginDirectory } from "@/components/plugin-directory";
import { plugins } from "@/content/plugins";

export default function HomePage() {
  const featuredPlugins = plugins.filter((plugin) => plugin.featured);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Awesome DSH Plugins home">
          <span className="brand-mark" aria-hidden="true">DSH</span>
          <span>Awesome Plugins</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#directory">Directory</a>
          <a href="#about">About</a>
          <a className="nav-action" href="#directory">Browse plugins</a>
        </nav>
      </header>

      <section id="top" className="hero" aria-labelledby="hero-title">
        <div className="hero-lines" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">Community index / Launch edition</p>
          <h1 id="hero-title">Find the right tools for your DSH workflow.</h1>
          <p className="hero-copy">
            Awesome DSH Plugins is a focused DeepSeek Harness plugin directory for
            discovering community-built DSH plugins, reading their source, and
            copying a clear install command.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#directory">Explore the directory</a>
            <a className="text-link" href="#about">How listings work</a>
          </div>
        </div>
        <dl className="hero-stats" aria-label="Directory statistics">
          <div>
            <dt>Listed</dt>
            <dd>{plugins.length}</dd>
          </div>
          <div>
            <dt>Featured</dt>
            <dd>{featuredPlugins.length}</dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{new Set(plugins.map((plugin) => plugin.category)).size}</dd>
          </div>
        </dl>
      </section>

      <PluginDirectory featuredPlugins={featuredPlugins} />

      <section id="about" className="about-section" aria-labelledby="about-title">
        <div>
          <p className="eyebrow">A practical starting point</p>
          <h2 id="about-title">A directory for awesome DSH plugins.</h2>
        </div>
        <div className="about-copy">
          <p>
            This is an independent community project, not an official DeepSeek or
            DeepSeek Harness property. Every listing points to its public source
            repository and carries a transparent verification label.
          </p>
          <p>
            Community discovered means a repository was found, not that its plugin
            bundle was checked. Structural verification only confirms the presence
            of a <code>dsh.bundle.patch</code> file and its referenced patch file;
            it is not a security audit or an endorsement.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <p>Awesome DSH Plugins is an independent community directory.</p>
        <a href="#top">Back to top</a>
      </footer>
    </main>
  );
}
