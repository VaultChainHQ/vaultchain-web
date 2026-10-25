import { describe, expect, it } from "vitest";
import { allowedOrigins, corsHeaders, preflightHeaders } from "../lib/cors";

const UP = "https://vaultchain-upload.vercel.app";

describe("faucet CORS", () => {
  it("defaults to the upload site only", () => {
    expect(allowedOrigins(undefined)).toEqual([UP]);
    expect(allowedOrigins("")).toEqual([UP]);
  });
  it("parses a list, trims slashes, and 'none' disables it", () => {
    expect(allowedOrigins(" https://a.example/ , https://b.example ")).toEqual(["https://a.example", "https://b.example"]);
    expect(allowedOrigins("none")).toEqual([]);
  });
  it("echoes only an exact allowed origin, never a wildcard", () => {
    const h = corsHeaders(UP, [UP]);
    expect(h["Access-Control-Allow-Origin"]).toBe(UP);
    expect(h.Vary).toBe("Origin");
    for (const bad of ["https://evil.example", UP + ".evil.example", "http://vaultchain-upload.vercel.app", "null", "", null, undefined]) {
      expect(corsHeaders(bad, [UP])["Access-Control-Allow-Origin"]).toBeUndefined();
    }
    expect(Object.values(corsHeaders(UP, [UP]))).not.toContain("*");
  });
  it("preflight advertises methods and headers only to allowed origins", () => {
    const ok = preflightHeaders(UP, [UP]);
    expect(ok["Access-Control-Allow-Methods"]).toContain("POST");
    expect(ok["Access-Control-Allow-Headers"]).toBe("Content-Type");
    expect(preflightHeaders("https://evil.example", [UP])["Access-Control-Allow-Methods"]).toBeUndefined();
  });
});
