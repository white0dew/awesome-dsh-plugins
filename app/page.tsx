import { HomeShell } from "@/components/home-shell";
import { LocaleProvider } from "@/components/locale-provider";

export default function HomePage() {
  return (
    <LocaleProvider>
      <HomeShell />
    </LocaleProvider>
  );
}
