import type { Plugin } from "@/content/plugins.generated";
import { siteName, siteUrl } from "@/lib/site";

export const ARTALK_SITE_NAME = siteName;

export function getPluginArtalkPageKey(plugin: Plugin) {
  return `plugin:${plugin.repoUrl}#${plugin.name}`;
}

export function getPluginArtalkPageUrl(plugin: Pick<Plugin, "repository">) {
  const url = new URL(siteUrl);
  url.searchParams.set("plugin", plugin.repository);
  return url.toString();
}
