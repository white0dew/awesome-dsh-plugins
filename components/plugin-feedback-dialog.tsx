"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Plugin } from "@/content/plugins.generated";
import { siteUrl } from "@/lib/site";

type ArtalkInstance = {
  destroy: () => void;
};

type PageVote = {
  id: number;
  up: number;
};

type VoteStatus = "loading" | "ready" | "unavailable" | "error";

export type FeedbackPanelFocus = "likes" | "comments";

const artalkSiteName = "Awesome DSH Plugins";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapResponse(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  return isRecord(payload.data) ? payload.data : payload;
}

function readPageVote(payload: unknown): PageVote | null {
  const data = unwrapResponse(payload);
  if (!data || !isRecord(data.page)) return null;

  const { id, vote_up: up } = data.page;
  return (
    typeof id === "number" &&
    Number.isFinite(id) &&
    Number.isInteger(id) &&
    id > 0 &&
    typeof up === "number" &&
    Number.isFinite(up) &&
    up >= 0
  )
    ? { id, up }
    : null;
}

function readVoteCount(payload: unknown): number | null {
  const data = unwrapResponse(payload);
  if (!data) return null;
  const up = data.up;
  return typeof up === "number" && Number.isFinite(up) && up >= 0 ? up : null;
}

function withValue(template: string, value: string | number) {
  return template.replace("{count}", String(value)).replace("{name}", String(value));
}

export function PluginFeedbackDialog({
  plugin,
  initialFocus,
  onClose,
}: {
  plugin: Plugin | null;
  initialFocus: FeedbackPanelFocus;
  onClose: () => void;
}) {
  const { locale, text } = useLocale();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const likesSectionRef = useRef<HTMLElement>(null);
  const commentsSectionRef = useRef<HTMLElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const artalkContainerRef = useRef<HTMLDivElement>(null);
  const artalkInstanceRef = useRef<ArtalkInstance | null>(null);
  const [pageVote, setPageVote] = useState<PageVote | null>(null);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>("loading");
  const [isVoting, setIsVoting] = useState(false);
  const [voteFailed, setVoteFailed] = useState(false);
  const [commentsError, setCommentsError] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);
  const pageKey = plugin ? `plugin:${plugin.repository}` : "";
  const pageUrl = plugin ? `${siteUrl}/?plugin=${encodeURIComponent(plugin.repository)}` : "";

  useEffect(() => {
    if (!plugin) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, plugin]);

  useEffect(() => {
    if (!plugin) return;

    const focusTarget = initialFocus === "likes" ? likesSectionRef.current : commentsSectionRef.current;
    const focusTimer = window.setTimeout(() => {
      focusTarget?.scrollIntoView({ block: "nearest" });
      focusTarget?.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [initialFocus, plugin]);

  useEffect(() => {
    if (!plugin) return;

    const controller = new AbortController();
    let mounted = true;

    const params = new URLSearchParams({
      site_name: artalkSiteName,
      page_key: pageKey,
      page_title: plugin.name,
      page_url: pageUrl,
      limit: "0",
    });

    void fetch(`/artalk/api/v2/comments?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Comments request failed");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (!mounted) return;
        const vote = readPageVote(payload);
        setPageVote(vote);
        setVoteStatus(vote ? "ready" : "unavailable");
      })
      .catch((error: unknown) => {
        if (!mounted || (error instanceof DOMException && error.name === "AbortError")) return;
        setPageVote(null);
        setVoteStatus("error");
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [pageKey, pageUrl, plugin]);

  useEffect(() => {
    if (initialFocus === "likes" && pageVote) {
      likeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [initialFocus, pageVote]);

  useEffect(() => {
    if (!plugin || !artalkContainerRef.current) return;

    let mounted = true;
    let instance: ArtalkInstance | null = null;

    void import("artalk")
      .then(({ default: Artalk }) => {
        if (!mounted || !artalkContainerRef.current) return;

        instance = Artalk.init({
          el: artalkContainerRef.current,
          server: "/artalk",
          site: artalkSiteName,
          pageKey,
          pageTitle: plugin.name,
          locale: locale === "zh" ? "zh-CN" : "en",
          darkMode: true,
          vote: true,
          voteDown: false,
          pvAdd: false,
          useBackendConf: false,
          listFetchParamsModifier(params) {
            params.site_name = artalkSiteName;
            params.page_key = pageKey;
            params.page_title = plugin.name;
            params.page_url = pageUrl;
          },
        });
        artalkInstanceRef.current = instance;
      })
      .catch(() => {
        if (mounted) setCommentsError(true);
      });

    return () => {
      mounted = false;
      instance?.destroy();
      if (artalkInstanceRef.current === instance) artalkInstanceRef.current = null;
    };
  }, [locale, pageKey, pageUrl, plugin]);

  if (!plugin) return null;

  async function handleVote() {
    if (!pageVote || isVoting) return;

    setIsVoting(true);
    setVoteFailed(false);
    try {
      const response = await fetch(`/artalk/api/v2/votes/page_up/${pageVote.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Vote request failed");
      const payload: unknown = await response.json();
      const up = readVoteCount(payload);
      if (up === null) throw new Error("Vote response missing count");
      setPageVote((current) => (current ? { ...current, up } : current));
    } catch {
      setVoteFailed(true);
    } finally {
      setIsVoting(false);
    }
  }

  const likesMessage = voteStatus === "unavailable"
    ? text.likesUnavailable
    : voteStatus === "error" || voteFailed
      ? text.likesError
      : "";

  return (
    <div
      className="feedback-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="feedback-dialog-header">
          <div>
            <p className="dialog-kicker">{plugin.repository}</p>
            <h2 id={titleId}>{withValue(text.feedbackPanelTitle, plugin.name)}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="dialog-close" aria-label={text.closePanel} onClick={close}>
            <span aria-hidden="true">x</span>
          </button>
        </header>

        <section
          ref={likesSectionRef}
          className="feedback-likes-section"
          tabIndex={-1}
          aria-labelledby={`${titleId}-likes`}
        >
          <h3 id={`${titleId}-likes`}>{text.likes}</h3>
          {pageVote ? (
            <button ref={likeButtonRef} type="button" className="vote-button" onClick={handleVote} disabled={isVoting}>
              {withValue(text.likeButton, pageVote.up)}
            </button>
          ) : null}
          {likesMessage ? <p className="feedback-status" role="status">{likesMessage}</p> : null}
        </section>

        <section
          ref={commentsSectionRef}
          className="feedback-comments-section"
          tabIndex={-1}
          aria-labelledby={`${titleId}-comments`}
        >
          <h3 id={`${titleId}-comments`}>{text.comments}</h3>
          {commentsError ? <p className="feedback-status" role="status">{text.commentsError}</p> : null}
          <div ref={artalkContainerRef} className="feedback-comments" />
        </section>
      </section>
    </div>
  );
}
