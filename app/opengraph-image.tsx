import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Awesome DSH Plugins - DeepSeek Harness Plugin Directory";
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
          background: "#07171d",
          color: "#effffa",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "68px",
          width: "100%",
        }}
      >
        <div style={{ color: "#62e6c6", display: "flex", fontSize: 26, letterSpacing: 4 }}>
          COMMUNITY INDEX / DSH
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
            Awesome DSH Plugins
          </div>
          <div style={{ color: "#b8d2cf", display: "flex", fontSize: 31 }}>
            A DeepSeek Harness plugin directory
          </div>
        </div>
        <div style={{ color: "#ff998d", display: "flex", fontSize: 24 }}>
          Source links. Clear install commands. Transparent verification labels.
        </div>
      </div>
    ),
    size,
  );
}
