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

    // Localhost, LAN & dev tunnel origins
    const isDev = process.env.NODE_ENV !== "production";
    const allowLocal = process.env.ALLOW_LOCALHOST === "true" || (isDev && process.env.ALLOW_LOCALHOST !== "false");

    if (allowLocal) {
        try {
            const url = new URL(origin);
            const host = url.hostname.toLowerCase();

            // Loopback addresses
            if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
                return true;
            }

            // Private Local Area Network (LAN) IPv4 ranges (RFC 1918)
            // - 192.168.0.0 - 192.168.255.255 (e.g. mobile testing on Wi-Fi)
            // - 10.0.0.0 - 10.255.255.255
            // - 172.16.0.0 - 172.31.255.255
            if (
                /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
                /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
                /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
            ) {
                return true;
            }

            // mDNS local domain (.local)
            if (host.endsWith(".local")) {
                return true;
            }

            // Known dev tunnel services
            if (
                host.endsWith("serveousercontent.com") ||
                host.endsWith("serveo.net") ||
                host.endsWith("localtunnel.me") ||
                host.endsWith("ngrok-free.app") ||
                host.endsWith("ngrok.io")
            ) {
                return true;
            }
        } catch {
            // Fallback string matching for non-standard origin values
            if (
                origin.startsWith("http://localhost") ||
                origin.startsWith("https://localhost") ||
                origin.startsWith("http://127.0.0.1") ||
                origin.startsWith("https://127.0.0.1") ||
                origin.startsWith("http://[::1]") ||
                origin.startsWith("http://192.168.") ||
                origin.startsWith("https://192.168.") ||
                origin.startsWith("http://10.") ||
                origin.startsWith("https://10.")
            ) {
                return true;
            }
        }
    }

    return false;
};
