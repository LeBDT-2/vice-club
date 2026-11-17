import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/security/redirect";

describe("URL de retour après connexion (anti-redirection ouverte)", () => {
  it.each([
    ["/compte", "/compte"],
    ["/joueurs?dispo=maintenant#liste", "/joueurs?dispo=maintenant#liste"],
    ["  /mon-garage  ", "/mon-garage"],
  ])("accepte le chemin interne %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/%0d%0aSet-Cookie:x",
    "/compte\u0000",
    "/api/jeux/x",
    "/auth/confirm?next=//evil",
    "",
    "compte",
    "/" + "a".repeat(600),
  ])("refuse %s", (input) => {
    expect(safeNextPath(input, "/")).toBe("/");
  });

  it("refuse les valeurs non textuelles", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/compte"])).toBe("/");
  });
});
