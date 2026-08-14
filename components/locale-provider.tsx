"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { copy, localeNames, pageTitles, type Locale } from "@/lib/i18n";

const localeStorageKey = "awesome-dsh-plugins.locale";
const automaticLocaleStorageKey = "awesome-dsh-plugins.automatic-locale";
const validLocales = new Set<Locale>(["en", "zh"]);

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: Record<string, string>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value !== null && validLocales.has(value as Locale);
}

function browserLocale(): Locale {
  return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>("en");
  const manualLocale = useRef<Locale | null>(null);

  useEffect(() => {
    let localeTimer: number | undefined;
    const applyLocale = (nextLocale: Locale) => {
      localeTimer = window.setTimeout(() => setCurrentLocale(nextLocale), 0);
    };
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(queryLocale)) {
      manualLocale.current = queryLocale;
      localStorage.setItem(localeStorageKey, queryLocale);
      applyLocale(queryLocale);
      return () => window.clearTimeout(localeTimer);
    }

    const storedLocale = localStorage.getItem(localeStorageKey);
    if (isLocale(storedLocale)) {
      manualLocale.current = storedLocale;
      applyLocale(storedLocale);
      return () => window.clearTimeout(localeTimer);
    }

    applyLocale(browserLocale());
    const cachedAutomaticLocale = sessionStorage.getItem(automaticLocaleStorageKey);
    if (isLocale(cachedAutomaticLocale)) {
      applyLocale(cachedAutomaticLocale);
      return () => window.clearTimeout(localeTimer);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    void fetch("https://ipwho.is/?fields=success,country_code", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ success?: boolean; country_code?: string }>;
      })
      .then((result) => {
        if (!result?.success || manualLocale.current) return;
        const automaticLocale: Locale = result.country_code?.toUpperCase() === "CN" ? "zh" : "en";
        sessionStorage.setItem(automaticLocaleStorageKey, automaticLocale);
        applyLocale(automaticLocale);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));

    return () => {
      if (localeTimer !== undefined) window.clearTimeout(localeTimer);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = pageTitles[locale];
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      manualLocale.current = nextLocale;
      localStorage.setItem(localeStorageKey, nextLocale);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", nextLocale);
      window.history.replaceState({}, "", url);
      setCurrentLocale(nextLocale);
    },
    text: copy[locale],
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function LocaleControl() {
  const { locale, setLocale, text } = useLocale();

  return (
    <div className="locale-control" role="group" aria-label={text.language}>
      {(["en", "zh"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
        >
          {option === "en" ? "EN" : localeNames.zh}
        </button>
      ))}
    </div>
  );
}
