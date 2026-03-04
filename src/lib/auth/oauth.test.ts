import { beforeEach, describe, expect, it } from "vitest";
import {
  createOAuthPkceCookieValue,
  createOAuthStateCookieValue,
  getCookieValueFromRequest,
  getOAuthPkceCookieName,
  getOAuthStateCookieName,
  verifyOAuthPkceCookie,
  verifyOAuthStateCookie,
} from "@/lib/auth/oauth";

describe("oauth helpers", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "this-is-a-very-long-session-secret-for-tests";
  });

  it("crea y valida state cookie para redirect seguro", () => {
    const stateCookie = createOAuthStateCookieValue({
      provider: "google",
      nextPath: "/checkout",
    });

    const verified = verifyOAuthStateCookie({
      expectedProvider: "google",
      expectedState: stateCookie.state,
      cookieValue: stateCookie.cookieValue,
    });

    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.nextPath).toBe("/checkout");
    }
  });

  it("falla state cookie si cambia el estado", () => {
    const stateCookie = createOAuthStateCookieValue({
      provider: "facebook",
      nextPath: "/account",
    });

    const verified = verifyOAuthStateCookie({
      expectedProvider: "facebook",
      expectedState: "estado-invalido",
      cookieValue: stateCookie.cookieValue,
    });

    expect(verified.ok).toBe(false);
  });

  it("crea y valida pkce cookie para twitter", () => {
    const stateCookie = createOAuthStateCookieValue({
      provider: "twitter",
      nextPath: "/account",
    });
    const pkceCookie = createOAuthPkceCookieValue({
      provider: "twitter",
      state: stateCookie.state,
    });

    const verifiedPkce = verifyOAuthPkceCookie({
      expectedProvider: "twitter",
      expectedState: stateCookie.state,
      cookieValue: pkceCookie.cookieValue,
    });

    expect(verifiedPkce.ok).toBe(true);
    if (verifiedPkce.ok) {
      expect(verifiedPkce.codeVerifier.length).toBeGreaterThan(20);
    }
  });

  it("extrae cookie específica desde request", () => {
    const request = new Request("http://localhost:3000", {
      headers: {
        cookie: `${getOAuthStateCookieName()}=abc; ${getOAuthPkceCookieName()}=def`,
      },
    });
    expect(getCookieValueFromRequest(request, getOAuthPkceCookieName())).toBe("def");
  });
});
