"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PluginFeedbackDialog, type FeedbackPanelFocus } from "@/components/plugin-feedback-dialog";
import { useLocale } from "@/components/locale-provider";
import {
  categories,
  categoryById,
  plugins,
  type Plugin,
  type PluginCategory,
} from "@/content/plugins.generated";

type DirectoryCategory = "all" | PluginCategory;
type CopyState = "idle" | "copied" | "failed";

function withValue(template: string, value: string | number) {
  return template.replace("{count}", String(value)).replace("{name}", String(value));
}

function withCategory(template: string, category: string, count: number) {
  return template.replace("{category}", category).replace("{count}", String(count));
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
  onOpenFeedback,
}: {
  plugin: Plugin;
  onOpenFeedback: (plugin: Plugin, focus: FeedbackPanelFocus) => void;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
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

  const copyStatus = copyState === "copied"
    ? withValue(text.copyStatus, plugin.name)
    : copyState === "failed"
      ? withValue(text.copyError, plugin.name)
      : "";

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
          <button
            type="button"
            className="row-icon-action row-icon-action-like"
            aria-label={withValue(text.openLikesPanel, plugin.name)}
            title={withValue(text.openLikesPanel, plugin.name)}
            onClick={() => onOpenFeedback(plugin, "likes")}
          >
            <span aria-hidden="true">♥</span>
          </button>
          <button
            type="button"
            className="row-icon-action"
            aria-label={withValue(text.openCommentsPanel, plugin.name)}
            title={withValue(text.openCommentsPanel, plugin.name)}
            onClick={() => onOpenFeedback(plugin, "comments")}
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
  const [feedbackTarget, setFeedbackTarget] = useState<{
    plugin: Plugin;
    focus: FeedbackPanelFocus;
  } | null>(null);
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

  const openFeedback = useCallback((plugin: Plugin, focus: FeedbackPanelFocus) => {
    setFeedbackTarget({ plugin, focus });
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
            <PluginRow key={plugin.id} plugin={plugin} onOpenFeedback={openFeedback} />
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
        key={feedbackTarget ? `${feedbackTarget.plugin.id}-${feedbackTarget.focus}` : "closed"}
        plugin={feedbackTarget?.plugin ?? null}
        initialFocus={feedbackTarget?.focus ?? "comments"}
        onClose={closeFeedback}
      />
    </section>
  );
}
