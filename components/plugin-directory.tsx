"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";
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

function PluginCard({ plugin, featured = false }: { plugin: Plugin; featured?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { locale, text } = useLocale();
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
          <p className="card-kicker">{category.label[locale]}</p>
          <h3>{plugin.name}</h3>
        </div>
        {plugin.latest ? <span className="new-label">{text.recentlyIndexed}</span> : null}
      </div>

      <p className="card-meta">
        <code>{plugin.repository}</code>
      </p>
      <p className="plugin-description">{plugin.description[locale]}</p>
      <p className="verification" title={plugin.verification.detail}>
        <span aria-hidden="true" />
        {text.communityDiscovered}
      </p>
      <div className="install-block">
        <code>{plugin.installCommand}</code>
      </div>
      <div className="card-actions">
        <button type="button" className="copy-button" onClick={handleCopy}>
          {copied ? text.copied : text.copyInstall}
        </button>
        <a href={plugin.repoUrl} target="_blank" rel="noreferrer">
          {text.viewGithub}
        </a>
      </div>
    </article>
  );
}

export function PluginDirectory({ featuredPlugins }: PluginDirectoryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PluginCategory>("all");
  const { locale, text } = useLocale();

  const filteredPlugins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return plugins.filter((plugin) => {
      const matchesCategory = category === "all" || plugin.category === category;
      const searchable = [
        plugin.name,
        plugin.repository,
        plugin.description[locale],
        categoryById[plugin.category].label[locale],
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, locale, query]);

  const resultLabel = locale === "zh" ? text.plugins : filteredPlugins.length === 1 ? text.plugin : text.plugins;

  return (
    <>
      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <h2 id="featured-title">{text.featuredTitle}</h2>
          </div>
          <p>{text.featuredCopy}</p>
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
            <h2 id="directory-title">{text.searchTitle}</h2>
          </div>
          <p id="directory-description">{text.searchCopy}</p>
        </div>

        <details className="filter-panel" aria-describedby="directory-description">
          <summary>{text.filters}</summary>
          <div className="filter-bar">
            <div className="search-field">
              <label htmlFor="plugin-search">{text.search}</label>
              <input
                id="plugin-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.searchPlaceholder}
              />
            </div>
            <div className="category-field">
              <label htmlFor="category-filter">{text.category}</label>
              <select
                id="category-filter"
                value={category}
                onChange={(event) => setCategory(event.target.value as "all" | PluginCategory)}
              >
                <option value="all">{text.allCategories}</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label[locale]}
                  </option>
                ))}
              </select>
            </div>
            <p className="result-count" aria-live="polite">
              {filteredPlugins.length} {resultLabel}
            </p>
          </div>
        </details>

        {filteredPlugins.length > 0 ? (
          <div className="plugin-grid">
            {filteredPlugins.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <p>{text.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              {text.clearFilters}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
