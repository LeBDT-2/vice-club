import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGarageBySlug } from "@/server/data/garage";
import { formatVc } from "@/lib/utils/format";

export const alt = "Garage VICE CLUB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Carte de partage d'un garage public (les garages privés produisent une carte générique). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getGarageBySlug(slug);
  const isPublic = g && g.visibility === "public" && !g.hidden;
  const vehicles = isPublic ? g.vehicles.slice(0, 5) : [];
  // Images lues directement dans notre Storage (aucune URL distante arbitraire).
  const storage = createAdminClient().storage.from("public-media");
  const images = await Promise.all(
    vehicles.map(async (v) => {
      if (!v.imagePath) return null;
      const { data } = await storage.download(v.imagePath);
      if (!data) return null;
      // Satori ne lit pas le WebP : conversion en PNG.
      const sharp = (await import("sharp")).default;
      const png = await sharp(Buffer.from(await data.arrayBuffer())).resize(400, 250, { fit: "cover" }).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    }),
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #1c0f3a 0%, #7a2468 55%, #ff8a5c 100%)", padding: 56, color: "#f5f0ff" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, fontStyle: "italic" }}>
          <span>VICE</span>
          <span style={{ color: "#ff3e8a", marginLeft: 8 }}>CLUB</span>
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 900, fontStyle: "italic", marginTop: 18, lineHeight: 1.05 }}>{isPublic ? g.name : "Garage ultime"}</div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 10, color: "#f5f0ffcc" }}>
          {isPublic ? `par ${g.owner?.username ?? "un joueur"} · ${formatVc(g.total)}` : "Compose ton garage de rêve sur VICE CLUB"}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
          {vehicles.map((v, i) => (
            <div key={v.id} style={{ display: "flex", flexDirection: "column", width: 200, borderRadius: 18, overflow: "hidden", background: "#10162a", border: "2px solid #2b3354" }}>
              {images[i] ? (
                 
                <img src={images[i]!} width={200} height={125} style={{ objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ width: 200, height: 125, background: "#171d33" }} />
              )}
              <div style={{ display: "flex", padding: "10px 12px", fontSize: 22, fontWeight: 700 }}>{v.name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
