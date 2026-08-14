"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Plugin } from "@/content/plugins.generated";
import { ARTALK_SITE_NAME, getPluginArtalkPageKey, getPluginArtalkPageUrl } from "@/lib/artalk";

type ArtalkInstance = {
  destroy: () => void;
};

function withValue(template: string, value: string | number) {
  return template.replace("{count}", String(value)).replace("{name}", String(value));
}

export function PluginFeedbackDialog({
  plugin,
  onClose,
}: {
  plugin: Plugin | null;
  onClose: () => void;
}) {
  const { locale, text } = useLocale();
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const artalkContainerRef = useRef<HTMLDivElement>(null);
  const artalkInstanceRef = useRef<ArtalkInstance | null>(null);
  const [commentsError, setCommentsError] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);
  const pageKey = plugin ? getPluginArtalkPageKey(plugin) : "";
  const pageUrl = plugin ? getPluginArtalkPageUrl(plugin) : "";

  useEffect(() => {
    if (!plugin) return;

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      activeElement?.focus();
    };
  }, [close, plugin]);

  useEffect(() => {
    if (!plugin || !artalkContainerRef.current) return;

    let mounted = true;
    let instance: ArtalkInstance | null = null;
    setCommentsError(false);

    void import("artalk")
      .then(({ default: Artalk }) => {
        if (!mounted || !artalkContainerRef.current) return;

        instance = Artalk.init({
          el: artalkContainerRef.current,
          server: "/artalk",
          site: ARTALK_SITE_NAME,
          pageKey,
          pageTitle: plugin.name,
          locale: locale === "zh" ? "zh-CN" : "en",
          darkMode: true,
          vote: true,
          voteDown: false,
          pvAdd: false,
          useBackendConf: false,
          listFetchParamsModifier(params) {
            params.site_name = ARTALK_SITE_NAME;
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

  return (
    <div
      className="feedback-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section ref={dialogRef} className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="feedback-dialog-header">
          <div>
            <p className="dialog-kicker">{plugin.repository}</p>
            <h2 id={titleId}>{withValue(text.commentsPanelTitle, plugin.name)}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="dialog-close" aria-label={text.closeCommentsPanel} onClick={close}>
            <span aria-hidden="true">x</span>
          </button>
        </header>

        <section className="feedback-comments-section" aria-labelledby={`${titleId}-comments`}>
          <h3 id={`${titleId}-comments`}>{text.comments}</h3>
          {commentsError ? <p className="feedback-status" role="status">{text.commentsError}</p> : null}
          <div ref={artalkContainerRef} className="feedback-comments" />
        </section>
      </section>
    </div>
  );
}
