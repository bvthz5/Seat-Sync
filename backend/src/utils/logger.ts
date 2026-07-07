import util from "util";

const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    
    // Foreground
    gray: "\x1b[90m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    
    // Backgrounds
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgBrightGreen: "\x1b[102m",
    bgBrightCyan: "\x1b[106m"
};

// Store original console methods
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
};

export class Logger {
    private static getTimestamp(): string {
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];
        const ms = String(now.getMilliseconds()).padStart(3, "0");
        return `${colors.gray}[${date} ${time}.${ms}]${colors.reset}`;
    }

    private static parseContextAndMessage(args: any[]): { context: string; message: string } {
        if (args.length === 0) {
            return { context: "", message: "" };
        }

        let fullText = "";
        if (typeof args[0] === "string") {
            const hasPlaceholder = /%[sdjoO]/.test(args[0]);
            if (hasPlaceholder) {
                fullText = util.format(args[0], ...args.slice(1));
            } else {
                fullText = args[0];
                for (let i = 1; i < args.length; i++) {
                    if (typeof args[i] === "object" && args[i] !== null) {
                        fullText += " " + util.inspect(args[i], { colors: true, depth: 5 });
                    } else {
                        fullText += " " + String(args[i]);
                    }
                }
            }
        } else {
            fullText = args.map(arg => {
                if (typeof arg === "object" && arg !== null) {
                    return util.inspect(arg, { colors: true, depth: 5 });
                }
                return String(arg);
            }).join(" ");
        }

        let context = "";
        let message = fullText;

        // Matches [Context]
        const bracketMatch = fullText.match(/^\[([^\]]+)\]\s*(.*)/s);
        // Matches Context: (between 2 and 25 characters, e.g. "generateSeats:")
        const colonMatch = fullText.match(/^([a-zA-Z0-9_\-\s]{2,25}):\s*(.*)/s);

        if (bracketMatch) {
            context = bracketMatch[1] ?? "";
            message = bracketMatch[2] ?? "";
        } else if (colonMatch) {
            context = colonMatch[1] ?? "";
            message = colonMatch[2] ?? "";
        }

        return { context, message };
    }

    private static formatContext(context: string): string {
        if (!context) return "";
        return ` ${colors.bold}${colors.cyan}[${context}]${colors.reset}`;
    }

    public static info(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgGreen} INFO ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = this.formatContext(context);
        originalConsole.log(`${timestamp} ${badge}${ctxStr} ${message}`);
    }

    public static success(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgBrightGreen}  OK  ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = context ? ` ${colors.bold}${colors.green}[${context}]${colors.reset}` : "";
        originalConsole.log(`${timestamp} ${badge}${ctxStr} ${message}`);
    }

    public static warn(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgYellow} WARN ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = context ? ` ${colors.bold}${colors.yellow}[${context}]${colors.reset}` : "";
        originalConsole.warn(`${timestamp} ${badge}${ctxStr} ${colors.yellow}${message}${colors.reset}`);
    }

    public static error(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgRed}ERROR ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = context ? ` ${colors.bold}${colors.red}[${context}]${colors.reset}` : "";
        originalConsole.error(`${timestamp} ${badge}${ctxStr} ${colors.red}${message}${colors.reset}`);
    }

    public static debug(...args: any[]): void {
        if (process.env.NODE_ENV === "production" && !process.env.DEBUG) return;
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgMagenta}DEBUG ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = context ? ` ${colors.bold}${colors.magenta}[${context}]${colors.reset}` : "";
        originalConsole.log(`${timestamp} ${badge}${ctxStr} ${colors.magenta}${message}${colors.reset}`);
    }

    public static http(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.white}${colors.bgBlue} HTTP ${colors.reset}`;
        const { context, message } = this.parseContextAndMessage(args);
        const ctxStr = context ? ` ${colors.bold}${colors.blue}[${context}]${colors.reset}` : "";
        originalConsole.log(`${timestamp} ${badge}${ctxStr} ${message}`);
    }

    /**
     * Replaces global console methods to automatically format standard console logs
     */
    public static overrideConsole(): void {
        console.log = (...args) => {
            // If it's already structured/formatted by our logger, just print it directly.
            if (typeof args[0] === "string" && args[0].includes("\x1b[")) {
                originalConsole.log(...args);
                return;
            }
            this.info(...args);
        };

        console.info = (...args) => {
            if (typeof args[0] === "string" && args[0].includes("\x1b[")) {
                originalConsole.info(...args);
                return;
            }
            this.info(...args);
        };

        console.warn = (...args) => {
            if (typeof args[0] === "string" && args[0].includes("\x1b[")) {
                originalConsole.warn(...args);
                return;
            }
            this.warn(...args);
        };

        console.error = (...args) => {
            if (typeof args[0] === "string" && args[0].includes("\x1b[")) {
                originalConsole.error(...args);
                return;
            }
            this.error(...args);
        };

        console.debug = (...args) => {
            if (typeof args[0] === "string" && args[0].includes("\x1b[")) {
                originalConsole.debug(...args);
                return;
            }
            this.debug(...args);
        };

        // Notify that the logger has successfully initialized
        this.success("Console logs successfully hooked into professional Logger system.");
    }
}
