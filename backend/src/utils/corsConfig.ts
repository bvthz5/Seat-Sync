/**
 * Dynamic CORS and Origin validation utility driven by .env configurations.
 * 
 * Supported Environment Variables:
 * - ALLOWED_ORIGINS: Comma-separated list of origins or wildcard patterns
 *                    (e.g., "https://seatsync.sjcetpalai.ac.in,*.sjcetpalai.ac.in,http://localhost:5173")
 * - FRONTEND_URL: Base URL of the client application (e.g., "https://seatsync.sjcetpalai.ac.in")
 * - CORS_ORIGIN: Alias for ALLOWED_ORIGINS
 * - ALLOW_LOCALHOST: "true" to allow loopback addresses even in production, or "false" to disallow (default: true in development)
 */

export const getAllowedOrigins = (): string[] => {
    const list: string[] = [];

    const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "";
    if (rawOrigins) {
        list.push(...rawOrigins.split(",").map((s) => s.trim()).filter(Boolean));
    }

    if (process.env.FRONTEND_URL && !list.includes(process.env.FRONTEND_URL.trim())) {
        list.push(process.env.FRONTEND_URL.trim());
    }

    return list;
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
    // Requests without origin (like server-to-server, curl, Postman, native mobile)
    if (!origin) return true;

    const allowed = getAllowedOrigins();

    // Allow all if "*" is present
    if (allowed.includes("*")) return true;

    // Direct match against configured origins
    if (allowed.includes(origin)) return true;

    // Wildcard matching (e.g., "*.sjcetpalai.ac.in" or "*.ac.in")
    for (const pattern of allowed) {
        if (pattern.startsWith("*.")) {
            const rootDomain = pattern.slice(2).toLowerCase();
            try {
                const url = new URL(origin);
                const host = url.hostname.toLowerCase();
                if (host === rootDomain || host.endsWith("." + rootDomain)) {
                    return true;
                }
            } catch {
                // Ignore URL parsing errors for non-standard origin headers
            }
        }
    }

    // Localhost & dev tunnel origins
    const isDev = process.env.NODE_ENV !== "production";
    const allowLocal = process.env.ALLOW_LOCALHOST === "true" || (isDev && process.env.ALLOW_LOCALHOST !== "false");

    if (allowLocal) {
        if (
            origin.startsWith("http://localhost") ||
            origin.startsWith("https://localhost") ||
            origin.startsWith("http://127.0.0.1") ||
            origin.startsWith("https://127.0.0.1") ||
            origin.startsWith("http://[::1]") ||
            origin.includes("serveousercontent.com") ||
            origin.includes("serveo.net") ||
            origin.includes("localtunnel.me")
        ) {
            return true;
        }
    }

    return false;
};
