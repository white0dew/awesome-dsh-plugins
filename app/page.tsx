import { HomeShell } from "@/components/home-shell";
import { LocaleProvider } from "@/components/locale-provider";
import { plugins } from "@/content/plugins.generated";

export default function HomePage() {
  const featuredPlugins = plugins.filter((plugin) => plugin.featured);

  return (
    <LocaleProvider>
      <HomeShell featuredPlugins={featuredPlugins} />
    </LocaleProvider>
  );
}
