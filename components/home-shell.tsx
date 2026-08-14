"use client";

import Image from "next/image";
import { LocaleControl, useLocale } from "@/components/locale-provider";
import { PluginDirectory } from "@/components/plugin-directory";
import { plugins } from "@/content/plugins.generated";

function withCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

export function HomeShell() {
  const { text } = useLocale();

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#directory" aria-label={text.brandAria}>
          <Image className="brand-wordmark" src="/deepseek-wordmark.png" width={69} height={15} alt="DeepSeek" priority />
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-name">Awesome DSH Plugins</span>
          <span className="catalog-count">{withCount(text.catalogCount, plugins.length)}</span>
        </a>
        <div className="topbar-actions">
          <a className="github-link" href="https://github.com/white0dew/awesome-dsh-plugins" target="_blank" rel="noreferrer">
            {text.github}
          </a>
          <LocaleControl />
        </div>
      </header>

      <PluginDirectory />
    </main>
  );
}
