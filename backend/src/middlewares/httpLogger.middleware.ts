import { Request, Response, NextFunction } from "express";
import { Logger } from "../utils/logger.js";

const methodColors: Record<string, string> = {
    GET: "\x1b[1m\x1b[32m",    // Bold Green
    POST: "\x1b[1m\x1b[36m",   // Bold Cyan
    PUT: "\x1b[1m\x1b[33m",    // Bold Yellow
    PATCH: "\x1b[1m\x1b[33m",  // Bold Yellow
    DELETE: "\x1b[1m\x1b[31m", // Bold Red
};

export function httpLogger(req: Request, res: Response, next: NextFunction): void {
    // Skip health check and root paths to avoid spamming the console
    if (req.path === "/" || req.path === "/health") {
        return next();
    }

    const start = process.hrtime();

    res.on("finish", () => {
        const diff = process.hrtime(start);
        const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(1);

        const methodColor = methodColors[req.method] || "\x1b[1m\x1b[37m";
        const methodStr = `${methodColor}${req.method}\x1b[0m`;

        let statusColor = "\x1b[1m\x1b[32m"; // 2xx Green
        if (res.statusCode >= 500) {
            statusColor = "\x1b[1m\x1b[31m"; // 5xx Red
        } else if (res.statusCode >= 400) {
            statusColor = "\x1b[1m\x1b[33m"; // 4xx Yellow
        } else if (res.statusCode >= 300) {
            statusColor = "\x1b[1m\x1b[36m"; // 3xx Cyan
        }

        const statusStr = `${statusColor}${res.statusCode}\x1b[0m`;
        
        Logger.http(`[HTTP] ${methodStr} ${req.originalUrl || req.url} - ${statusStr} - \x1b[36m${durationMs}ms\x1b[0m`);
    });

    next();
}

