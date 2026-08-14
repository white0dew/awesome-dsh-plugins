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
type CopyState = "idle" | "copied" | "failed";
type LikeState = "idle" | "loading" | "error";

type ArtalkPage = {
  id: number;
  up: number | null;
};

function withValue(template: string, value: string | number) {
  return template.replace("{count}", String(value)).replace("{name}", String(value));
}

function withCategory(template: string, category: string, count: number) {
  return template.replace("{category}", category).replace("{count}", String(count));
}

function withNameAndCount(template: string, name: string, count: number) {
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

function PluginRow({
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

      const voteResponse = await fetch(`/artalk/api/v2/votes/page_up/${page.id}`, {
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
    : withNameAndCount(text.likeButtonCount, plugin.name, likeCount);
  const likeStatusId = `plugin-like-status-${plugin.id}`;

  return (
    <article className="plugin-row">
      <a
        className="plugin-row-main"
        href={plugin.repoUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={withValue(text.openRepository, plugin.name)}
      >
        <div className="plugin-row-heading">
          <h3>{plugin.name}</h3>
          <span className="category-tag">{category.label[locale]}</span>
        </div>
        <p className="plugin-repository">
          <span>{text.originalRepository}</span>
          <code>{plugin.repository}</code>
          {plugin.stars > 0 ? (
            <span className="plugin-stars" title={withValue(text.starCount, plugin.stars)}>
              <span aria-hidden="true">★</span>
              <span>{withValue(text.stars, plugin.stars)}</span>
            </span>
          ) : null}
        </p>
        <p className="plugin-description">{plugin.description[locale]}</p>
        <p className="verification" title={text.communityDetail}>
          <strong>{text.communityDiscovered}</strong>
          <span>{text.communityDetail}</span>
        </p>
      </a>
      <div className="plugin-row-actions">
        <code className="install-command">{plugin.installCommand}</code>
        <div className="row-command-actions">
          <button
            type="button"
            className="row-action"
            aria-label={withValue(text.copyInstallFor, plugin.name)}
            onClick={handleCopy}
          >
            {copyState === "copied" ? text.copied : text.copyInstall}
          </button>
          <a
            className="row-action"
            href={plugin.repoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={withValue(text.githubFor, plugin.name)}
          >
            {text.viewGithub}
          </a>
          <div className="plugin-like-control">
            <button
              type="button"
              className="row-icon-action row-icon-action-like"
              aria-busy={likeState === "loading"}
              aria-describedby={likeMessage ? likeStatusId : undefined}
              aria-label={likeLabel}
              title={likeLabel}
              onClick={handleLike}
              disabled={likeState === "loading"}
            >
              <span aria-hidden="true">♥</span>
            </button>
            {likeCount !== null ? <span className="row-like-count" aria-hidden="true">{likeCount}</span> : null}
            {likeMessage ? (
              <span id={likeStatusId} className="plugin-like-status" data-state={likeState} role="status">
                {likeMessage}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="row-icon-action"
            aria-label={withValue(text.openCommentsPanel, plugin.name)}
            title={withValue(text.openCommentsPanel, plugin.name)}
            onClick={() => onOpenComments(plugin)}
          >
            <span aria-hidden="true">✎</span>
          </button>
        </div>
        <p className="copy-status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </article>
  );
}

export function PluginDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DirectoryCategory>("all");
  const [hydrated, setHydrated] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Plugin | null>(null);
  const { locale, text } = useLocale();

  const readUrlFilters = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get("cat");
    setQuery(params.get("q") ?? "");
    setCategory(isPluginCategory(urlCategory) ? urlCategory : "all");
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

  const updateUrl = useCallback((nextQuery: string, nextCategory: DirectoryCategory, mode: "push" | "replace") => {
    const url = new URL(window.location.href);
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) url.searchParams.set("q", trimmedQuery);
    else url.searchParams.delete("q");

    if (nextCategory === "all") url.searchParams.delete("cat");
    else url.searchParams.set("cat", nextCategory);

    if (mode === "push") window.history.pushState({}, "", url);
    else window.history.replaceState({}, "", url);
  }, []);

  const setSearch = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    updateUrl(nextQuery, category, "replace");
  }, [category, updateUrl]);

  const setCategoryFilter = useCallback((nextCategory: DirectoryCategory) => {
    setCategory(nextCategory);
    updateUrl(query, nextCategory, "push");
  }, [query, updateUrl]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    updateUrl("", "all", "push");
  }, [updateUrl]);

  const openComments = useCallback((plugin: Plugin) => {
    setFeedbackTarget(plugin);
  }, []);

  const closeFeedback = useCallback(() => setFeedbackTarget(null), []);

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

  const filtersActive = query.trim().length > 0 || category !== "all";

  return (
    <section id="directory" className="directory-section" aria-labelledby="directory-title">
      <div className="directory-heading">
        <div>
          <p className="directory-kicker">{text.directoryKicker}</p>
          <h1 id="directory-title">{text.searchTitle}</h1>
        </div>
        <p>{text.searchCopy}</p>
      </div>

      <div className="directory-toolbar">
        <div className="search-field">
          <label htmlFor="plugin-search">{text.search}</label>
          <input
            id="plugin-search"
            type="search"
            value={query}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.searchPlaceholder}
          />
        </div>
        <div className="directory-result-line">
          <p className="result-count" aria-live="polite">
            {withValue(text.resultPhrase, filteredPlugins.length)}
          </p>
          {filtersActive ? (
            <button type="button" className="clear-filters" onClick={clearFilters}>
              {text.clearFilters}
            </button>
          ) : null}
        </div>
        <div className="category-tabs" role="group" aria-label={text.categoryTabsAria}>
          <button
            type="button"
            className="category-tab"
            aria-pressed={category === "all"}
            aria-label={withCategory(text.categoryTabAria, text.allCategories, plugins.length)}
            onClick={() => setCategoryFilter("all")}
          >
            <span>{text.allCategories}</span>
            <span className="tab-count">{plugins.length}</span>
          </button>
          {categories.map((item) => {
            const count = plugins.filter((plugin) => plugin.category === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                className="category-tab"
                aria-pressed={category === item.id}
                aria-label={withCategory(text.categoryTabAria, item.label[locale], count)}
                onClick={() => setCategoryFilter(item.id)}
              >
                <span>{item.label[locale]}</span>
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredPlugins.length > 0 ? (
        <div className="plugin-list" aria-busy={!hydrated}>
          {filteredPlugins.map((plugin) => (
            <PluginRow key={plugin.id} plugin={plugin} onOpenComments={openComments} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <p>{text.noResults}</p>
          {filtersActive ? (
            <button type="button" className="clear-filters" onClick={clearFilters}>
              {text.clearFilters}
            </button>
          ) : null}
        </div>
      )}

      <PluginFeedbackDialog
        key={feedbackTarget?.id ?? "closed"}
        plugin={feedbackTarget}
        onClose={closeFeedback}
      />
    </section>
  );
}
