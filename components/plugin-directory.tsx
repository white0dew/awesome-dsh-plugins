"use client";

import { useMemo, useState } from "react";
import {
  categories,
  categoryById,
  plugins,
  type Plugin,
  type PluginCategory,
} from "@/content/plugins.generated";

type PluginDirectoryProps = {
  featuredPlugins: readonly Plugin[];
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function VerificationLabel({ plugin }: { plugin: Plugin }) {
  const isStructural = plugin.verification.state !== "community-discovered";

  return (
    <p className="verification" title={plugin.verification.detail}>
      <span className={isStructural ? "verification-dot verified" : "verification-dot"} aria-hidden="true" />
      <span>{isStructural ? "Structurally verified" : "Community discovered"}</span>
    </p>
  );
}

function PluginCard({ plugin, featured = false }: { plugin: Plugin; featured?: boolean }) {
  const [copied, setCopied] = useState(false);
  const category = categoryById[plugin.category];

  async function handleCopy() {
    try {
      await copyText(plugin.installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={featured ? "plugin-card plugin-card-featured" : "plugin-card"}>
      <div className="card-heading">
        <div>
          <p className="card-kicker">{category.label}</p>
          <h3>{plugin.name}</h3>
        </div>
        {plugin.latest ? <span className="new-label">Recently indexed</span> : null}
      </div>

      <p className="card-meta">
        <code>{plugin.repository}</code>
      </p>
      <p className="plugin-description">{plugin.description}</p>
      <VerificationLabel plugin={plugin} />
      <div className="install-block">
        <code>{plugin.installCommand}</code>
      </div>
      <div className="card-actions">
        <button type="button" className="copy-button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy install command"}
        </button>
        <a href={plugin.repoUrl} target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </div>
    </article>
  );
}

export function PluginDirectory({ featuredPlugins }: PluginDirectoryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PluginCategory>("all");

  const filteredPlugins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return plugins.filter((plugin) => {
      const matchesCategory = category === "all" || plugin.category === category;
      const searchable = [
        plugin.name,
        plugin.repository,
        plugin.description,
        categoryById[plugin.category].label,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query]);

  return (
    <>
      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <h2 id="featured-title">Featured DeepSeek Harness plugins</h2>
          </div>
          <p>
            A fast starting pack across terminal UI, file context, visualization, vision, and messaging for teams exploring the DSH ecosystem.
          </p>
        </div>
        <div className="featured-grid">
          {featuredPlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} featured />
          ))}
        </div>
      </section>

      <section id="directory" className="directory-section" aria-labelledby="directory-title">
        <div className="directory-heading">
          <div>
            <h2 id="directory-title">Search the public DSH plugin catalog</h2>
          </div>
          <p id="directory-description">
            Filter by capability, repository, or category across {plugins.length} GitHub listings in this DeepSeek Harness plugin directory.
          </p>
        </div>

        <div className="filter-bar" aria-describedby="directory-description">
          <div className="search-field">
            <label htmlFor="plugin-search">Search plugins</label>
            <input
              id="plugin-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try browser, memory, TUI, GitHub, or vision"
            />
          </div>
          <div className="category-field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value as "all" | PluginCategory)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <p className="result-count" aria-live="polite">
            {filteredPlugins.length} {filteredPlugins.length === 1 ? "plugin" : "plugins"}
          </p>
        </div>

        {filteredPlugins.length > 0 ? (
          <div className="plugin-grid">
            {filteredPlugins.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <p>No plugins match this search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
