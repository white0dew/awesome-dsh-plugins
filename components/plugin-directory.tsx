"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PluginFeedbackDialog } from "@/components/plugin-feedback-dialog";
import { useLocale } from "@/components/locale-provider";
import {
  categories,
  categoryById,
  plugins,
  type Plugin,
  type PluginCategory,
} from "@/content/plugins.generated";
import { ARTALK_SITE_NAME, getPluginArtalkPageKey, getPluginArtalkPageUrl } from "@/lib/artalk";

type DirectoryCategory = "all" | PluginCategory;
type DirectorySort = "featured" | "stars" | "name";
type CopyState = "idle" | "copied" | "failed";
type LikeState = "idle" | "loading" | "error";

type ArtalkPage = {
  id: number;
  up: number | null;
};

function withValue(template: string, value: string | number) {
  return template.replace("{count}", String(value)).replace("{name}", String(value));
}

function withCategory(template: string, category: string, count: string | number) {
  return template.replace("{category}", category).replace("{count}", String(count));
}

function withNameAndCount(template: string, name: string, count: string | number) {
  return template.replace("{name}", name).replace("{count}", String(count));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapArtalkResponse(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  return isRecord(payload.data) ? payload.data : payload;
}

function readArtalkPage(payload: unknown): ArtalkPage | null {
  const data = unwrapArtalkResponse(payload);
  if (!data || !isRecord(data.page)) return null;

  const { id, vote_up: up } = data.page;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;

  return {
    id,
    up: typeof up === "number" && Number.isFinite(up) && up >= 0 ? up : null,
  };
}

function readVoteCount(payload: unknown): number | null {
  const data = unwrapArtalkResponse(payload);
  const up = data?.up;
  return typeof up === "number" && Number.isFinite(up) && up >= 0 ? up : null;
}

function isPluginCategory(value: string | null): value is PluginCategory {
  return value !== null && categories.some((item) => item.id === value);
}

function isDirectorySort(value: string | null): value is DirectorySort {
  return value === "featured" || value === "stars" || value === "name";
}

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
  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) throw new Error("Copy command failed");
}

function PluginCard({
  plugin,
  onOpenComments,
}: {
  plugin: Plugin;
  onOpenComments: (plugin: Plugin) => void;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [likeState, setLikeState] = useState<LikeState>("idle");
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const { locale, text } = useLocale();
  const category = categoryById[plugin.category];
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US"), [locale]);

  async function handleCopy() {
    try {
      await copyText(plugin.installCommand);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2600);
    }
  }

  async function handleLike() {
    if (likeState === "loading") return;

    setLikeState("loading");
    try {
      const pageKey = getPluginArtalkPageKey(plugin);
      const pageUrl = getPluginArtalkPageUrl(plugin);
      const params = new URLSearchParams({
        site_name: ARTALK_SITE_NAME,
        page_key: pageKey,
        page_title: plugin.name,
        page_url: pageUrl,
        limit: "0",
      });
      const pageResponse = await fetch(`/artalk/api/v2/comments?${params.toString()}`);
      if (!pageResponse.ok) throw new Error("Artalk page request failed");

      const pagePayload: unknown = await pageResponse.json();
      const page = readArtalkPage(pagePayload);
      if (!page) throw new Error("Artalk response is missing a valid page id");
      if (page.up !== null) setLikeCount(page.up);

      const voteResponse = await fetch(`/artalk/api/v2/votes/page/${page.id}/up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!voteResponse.ok) throw new Error("Artalk vote request failed");

      const votePayload: unknown = await voteResponse.json();
      const up = readVoteCount(votePayload);
      if (up === null) throw new Error("Artalk vote response is missing a count");
      setLikeCount(up);
      setLikeState("idle");
    } catch {
      setLikeState("error");
    }
  }

  const copyStatus = copyState === "copied"
    ? withValue(text.copyStatus, plugin.name)
    : copyState === "failed"
      ? withValue(text.copyError, plugin.name)
      : "";
  const likeMessage = likeState === "loading"
    ? text.likeLoading
    : likeState === "error"
      ? text.likeError
      : "";
  const likeLabel = likeCount === null
    ? withValue(text.likeButton, plugin.name)
    : withNameAndCount(text.likeButtonCount, plugin.name, numberFormat.format(likeCount));
  const likeStatusId = `plugin-like-status-${plugin.id}`;

  return (
    <article className="plugin-card">
      <div className="plugin-card-heading">
        <div className="plugin-card-tags">
          <span className="category-tag">{category.label[locale]}</span>
          {plugin.featured ? <span className="featured-tag">{text.featured}</span> : null}
        </div>
        <h3><a className="plugin-title" href={plugin.repoUrl} target="_blank" rel="noreferrer">{plugin.name}</a></h3>
      </div>
      <a
        className="plugin-repository"
        href={plugin.repoUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={withValue(text.openRepository, plugin.name)}
      >
        {plugin.repository}
      </a>
      {plugin.stars > 0 ? (
        <div className="plugin-meta">
          <span className="plugin-stars" title={withValue(text.starCount, numberFormat.format(plugin.stars))}>
            <span aria-hidden="true">★</span> {numberFormat.format(plugin.stars)} {text.starsLabel}
          </span>
        </div>
      ) : null}
      <p className="plugin-description">{plugin.description[locale]}</p>
      <div className="plugin-card-actions">
        <button
          type="button"
          className="card-action card-action-primary"
          aria-label={withValue(text.copyInstallFor, plugin.name)}
          onClick={handleCopy}
        >
          {copyState === "copied" ? text.copied : copyState === "failed" ? text.copyFailed : text.copyInstall}
        </button>
        <a
          className="card-action"
          href={plugin.repoUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={withValue(text.githubFor, plugin.name)}
        >
          {text.viewGithub}
        </a>
        <button
          type="button"
          className="card-icon-action card-icon-action-like"
          aria-busy={likeState === "loading"}
          aria-describedby={likeMessage ? likeStatusId : undefined}
          aria-label={likeLabel}
          title={likeLabel}
          onClick={handleLike}
          disabled={likeState === "loading"}
        >
          <span aria-hidden="true">&#9829;</span>
          {likeCount !== null ? <span className="card-like-count" aria-hidden="true">{numberFormat.format(likeCount)}</span> : null}
        </button>
        <button
          type="button"
          className="card-icon-action"
          aria-label={withValue(text.openCommentsPanel, plugin.name)}
          title={withValue(text.openCommentsPanel, plugin.name)}
          onClick={() => onOpenComments(plugin)}
        >
          <span aria-hidden="true">&#9998;</span>
        </button>
      </div>
      {likeMessage ? <span id={likeStatusId} className="plugin-like-status" data-state={likeState} role="status">{likeMessage}</span> : null}
      <p className="copy-status" aria-live="polite">{copyStatus}</p>
    </article>
  );
}

export function PluginDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DirectoryCategory>("all");
  const [sort, setSort] = useState<DirectorySort>("featured");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Plugin | null>(null);
  const { locale, text } = useLocale();
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US"), [locale]);

  const readUrlFilters = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get("cat");
    const urlSort = params.get("sort");
    setQuery(params.get("q") ?? "");
    setCategory(isPluginCategory(urlCategory) ? urlCategory : "all");
    setSort(isDirectorySort(urlSort) ? urlSort : "featured");
    setFeaturedOnly(params.get("featured") === "1");
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      readUrlFilters();
      setHydrated(true);
    }, 0);
    window.addEventListener("popstate", readUrlFilters);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("popstate", readUrlFilters);
    };
  }, [readUrlFilters]);

  const updateUrl = useCallback(
    (
      nextQuery: string,
      nextCategory: DirectoryCategory,
      nextSort: DirectorySort,
      nextFeaturedOnly: boolean,
      mode: "push" | "replace",
    ) => {
      const url = new URL(window.location.href);
      const trimmedQuery = nextQuery.trim();
      if (trimmedQuery) {
        url.searchParams.set("q", trimmedQuery);
      } else {
        url.searchParams.delete("q");
      }
      if (nextCategory === "all") {
        url.searchParams.delete("cat");
      } else {
        url.searchParams.set("cat", nextCategory);
      }
      if (nextSort === "featured") {
        url.searchParams.delete("sort");
      } else {
        url.searchParams.set("sort", nextSort);
      }
      if (nextFeaturedOnly) {
        url.searchParams.set("featured", "1");
      } else {
        url.searchParams.delete("featured");
      }
      window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
    },
    [],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (hydrated) updateUrl(value, category, sort, featuredOnly, "replace");
  };

  const handleCategoryChange = (value: DirectoryCategory) => {
    setCategory(value);
    if (hydrated) updateUrl(query, value, sort, featuredOnly, "push");
  };

  const handleSortChange = (value: DirectorySort) => {
    setSort(value);
    if (hydrated) updateUrl(query, category, value, featuredOnly, "push");
  };

  const handleFeaturedChange = (value: boolean) => {
    setFeaturedOnly(value);
    if (hydrated) updateUrl(query, category, sort, value, "push");
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setSort("featured");
    setFeaturedOnly(false);
    if (hydrated) updateUrl("", "all", "featured", false, "push");
  };

  const filteredPlugins = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "zh" ? "zh-CN" : "en-US");
    const matching = plugins.filter((plugin) => {
      if (category !== "all" && plugin.category !== category) return false;
      if (featuredOnly && !plugin.featured) return false;
      if (!normalizedQuery) return true;
      const pluginCategory = categoryById[plugin.category];
      return [
        plugin.name,
        plugin.repository,
        plugin.description.en,
        plugin.description.zh,
        pluginCategory.label.en,
        pluginCategory.label.zh,
      ].some((value) => value.toLocaleLowerCase(locale === "zh" ? "zh-CN" : "en-US").includes(normalizedQuery));
    });

    return matching.sort((left, right) => {
      if (sort === "featured" && left.featured !== right.featured) return left.featured ? -1 : 1;
      if (sort === "stars" || sort === "featured") {
        if (left.stars !== right.stars) return right.stars - left.stars;
      }
      return left.name.localeCompare(right.name, locale === "zh" ? "zh-CN" : "en-US", { sensitivity: "base" });
    });
  }, [category, featuredOnly, locale, query, sort]);

  const featuredCount = useMemo(() => plugins.filter((plugin) => plugin.featured).length, []);

  return (
    <section id="directory" className="directory-section" aria-labelledby="directory-title">
      <header className="directory-header">
        <div className="directory-header-copy">
          <p className="directory-kicker">{text.directoryKicker}</p>
          <h1 id="directory-title">{text.searchTitle}</h1>
          <p>{text.searchCopy}</p>
        </div>
        <dl className="directory-stats" aria-label={text.directoryStats}>
          <div className="directory-stat"><dt>{text.statsPlugins}</dt><dd>{numberFormat.format(plugins.length)}</dd></div>
          <div className="directory-stat"><dt>{text.statsCategories}</dt><dd>{numberFormat.format(categories.length)}</dd></div>
          <div className="directory-stat"><dt>{text.statsFeatured}</dt><dd>{numberFormat.format(featuredCount)}</dd></div>
        </dl>
      </header>

      <div className="directory-workbench">
        <nav className="category-rail" aria-label={text.categoryTabsAria}>
          <p className="rail-label">{text.categoryNavigation}</p>
          <button
            type="button"
            className="category-nav-button"
            aria-pressed={category === "all"}
            aria-label={withCategory(text.categoryTabAria, text.allCategories, numberFormat.format(plugins.length))}
            onClick={() => handleCategoryChange("all")}
          >
            <span>{text.allCategories}</span><span>{numberFormat.format(plugins.length)}</span>
          </button>
          {categories.map((item) => {
            const count = plugins.filter((plugin) => plugin.category === item.id).length;
            const label = item.label[locale];
            return (
              <button
                type="button"
                className="category-nav-button"
                aria-pressed={category === item.id}
                aria-label={withCategory(text.categoryTabAria, label, numberFormat.format(count))}
                key={item.id}
                onClick={() => handleCategoryChange(item.id)}
              >
                <span>{label}</span><span>{numberFormat.format(count)}</span>
              </button>
            );
          })}
        </nav>

        <div className="catalog-panel">
          <div className="catalog-toolbar">
            <div className="search-field">
              <label htmlFor="plugin-search">{text.search}</label>
              <input
                id="plugin-search"
                type="search"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                name="plugin-search"
                autoComplete="off"
                placeholder={text.searchPlaceholder}
              />
            </div>
            <div className="sort-field">
              <label htmlFor="plugin-sort">{text.sortLabel}</label>
              <select id="plugin-sort" name="plugin-sort" value={sort} onChange={(event) => handleSortChange(event.target.value as DirectorySort)}>
                <option value="featured">{text.sortFeatured}</option>
                <option value="stars">{text.sortStars}</option>
                <option value="name">{text.sortName}</option>
              </select>
            </div>
            <label className="featured-filter">
              <input type="checkbox" checked={featuredOnly} onChange={(event) => handleFeaturedChange(event.target.checked)} />
              <span>{text.featuredOnly}</span>
            </label>
          </div>
          <div className="directory-result-line">
            <p className="result-count" aria-live="polite">{withValue(text.resultPhrase, numberFormat.format(filteredPlugins.length))}</p>
            {query || category !== "all" || sort !== "featured" || featuredOnly ? (
              <button type="button" className="clear-filters" onClick={clearFilters}>{text.clearFilters}</button>
            ) : null}
          </div>
          {filteredPlugins.length > 0 ? (
            <div className="plugin-grid">
              {filteredPlugins.map((plugin) => <PluginCard key={plugin.id} plugin={plugin} onOpenComments={setFeedbackTarget} />)}
            </div>
          ) : <p className="no-results">{text.noResults}</p>}
        </div>
      </div>

      {feedbackTarget ? <PluginFeedbackDialog plugin={feedbackTarget} onClose={() => setFeedbackTarget(null)} /> : null}
    </section>
  );
}
