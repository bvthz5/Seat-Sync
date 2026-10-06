import { CookieOptions } from "express";

/**
 * Generates cookie options driven strictly by .env configurations.
 * 
 * Supported Environment Variables:
 * - COOKIE_DOMAIN: Root domain for cookies across subdomains (e.g. ".sjcetpalai.ac.in")
 * - COOKIE_SAME_SITE: "lax" | "strict" | "none" (default: "lax")
 * - COOKIE_SECURE: "true" | "false" (defaults to true in production or when sameSite="none")
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => {
    const isProd = process.env.NODE_ENV === "production";

    const sameSiteEnv = (process.env.COOKIE_SAME_SITE || "").toLowerCase();
    const sameSite: "lax" | "strict" | "none" =
        sameSiteEnv === "none" ? "none" : sameSiteEnv === "strict" ? "strict" : "lax";

    const secureEnv = process.env.COOKIE_SECURE;
    const secure = secureEnv !== undefined
        ? secureEnv === "true"
        : (isProd || sameSite === "none");

    const configuredDomain = process.env.COOKIE_DOMAIN?.trim();
    // Only apply the domain attribute in production to prevent browsers rejecting cookies on localhost and LAN IPs (RFC 6265)
    const domain = isProd && configuredDomain ? configuredDomain : undefined;

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: "/",
        ...(domain && { domain }),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
};

export const getClearCookieOptions = (): CookieOptions => {
    const { maxAge, ...clearOptions } = getRefreshTokenCookieOptions();
    return clearOptions;
};
