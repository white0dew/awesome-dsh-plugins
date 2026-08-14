import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Awesome DSH Plugins - DeepSeek Harness plugins on GitHub";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#07111e",
          color: "#eff8ff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "68px",
          width: "100%",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(76,166,255,0.22), transparent 34%), radial-gradient(circle at 82% 18%, rgba(91,240,255,0.18), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0))",
        }}
      >
        <div style={{ color: "#84d8ff", display: "flex", fontSize: 24, letterSpacing: 3 }}>
          PUBLIC GITHUB DIRECTORY / DSH
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.02 }}>
            DeepSeek Harness plugins, tracked in one place.
          </div>
          <div style={{ color: "#bfd2e6", display: "flex", fontSize: 30 }}>
            Awesome DSH Plugins surfaces install commands, categories, and source links from the public ecosystem.
          </div>
        </div>
        <div style={{ color: "#7bb5ff", display: "flex", fontSize: 22 }}>
          GitHub sources. Searchable catalog. Independent community index.
        </div>
      </div>
    ),
    size,
  );
}
