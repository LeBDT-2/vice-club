import { describe, expect, it } from "vitest";
import { AVATAR_PRESETS, AVATAR_READY, presetFromPath, presetSrc } from "@/config/avatars";

describe("avatars tout prêts", () => {
  it("a des ids uniques, 10 hommes et 10 femmes", () => {
    expect(new Set(AVATAR_PRESETS.map((a) => a.id)).size).toBe(AVATAR_PRESETS.length);
    expect(AVATAR_PRESETS.filter((a) => a.group === "homme")).toHaveLength(10);
    expect(AVATAR_PRESETS.filter((a) => a.group === "femme")).toHaveLength(10);
  });

  it("n'accepte que des ids connus et prêts", () => {
    expect(presetFromPath(null)).toBeNull();
    expect(presetFromPath("abc/def.webp")).toBeNull();
    expect(presetFromPath("preset/../../etc/passwd")).toBeNull();
    expect(presetFromPath("preset/zz99")).toBeNull();
    for (const id of AVATAR_READY) expect(presetFromPath(`preset/${id}`)?.id).toBe(id);
  });

  it("sert les images depuis public/avatars/presets", () => {
    expect(presetSrc("m01")).toBe("/avatars/presets/m01.webp");
  });
});
