import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Awesome DSH Plugins - direct DeepSeek Harness plugin directory";
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
          background: "#061820",
          color: "#effaff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "68px",
          width: "100%",
        }}
      >
        <div style={{ color: "#7dd5e7", display: "flex", fontSize: 24 }}>
          INDEPENDENT DIRECTORY / DSH
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.02 }}>
            Direct routes to DSH plugins.
          </div>
          <div style={{ color: "#b8d3d9", display: "flex", fontSize: 30 }}>
            362 original GitHub repositories with clear primary actions.
          </div>
        </div>
        <div style={{ color: "#eacb80", display: "flex", fontSize: 22 }}>
          Original repositories. Clear categories. Independent, not official.
        </div>
      </div>
    ),
    size,
  );
}
