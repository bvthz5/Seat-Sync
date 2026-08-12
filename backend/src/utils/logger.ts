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

    // Bright Foreground
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",

    // Backgrounds
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",

    // Bright Backgrounds
    bgBrightRed: "\x1b[101m",
    bgBrightGreen: "\x1b[102m",
    bgBrightYellow: "\x1b[103m",
    bgBrightBlue: "\x1b[104m",
    bgBrightMagenta: "\x1b[105m",
    bgBrightCyan: "\x1b[106m",

    // Special Contrast
    blackText: "\x1b[30m",
};

// Store original console methods
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
};

export class Logger {
    private static isConsoleOverridden = false;

    /**
     * Get current timestamp in format: [YYYY-MM-DD HH:mm:ss.SSS] in dim gray
     */
    private static getTimestamp(): string {
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0];
        const ms = String(now.getMilliseconds()).padStart(3, "0");
        return `${colors.gray}[${date} ${time}.${ms}]${colors.reset}`;
    }

    /**
     * Remove Windows carriage returns (\r) to prevent console line overwrites
     */
    private static sanitize(text: string): string {
        return text.replace(/\r\n/g, "\n").replace(/\r/g, "");
    }

    /**
     * Parse context tags and formatted message arguments
     */
    private static parseArgs(args: any[]): { context: string; message: string; errorStack?: string | undefined } {
        if (args.length === 0) {
            return { context: "", message: "" };
        }

        let errorStack: string | undefined;
        const formattedParts: string[] = [];

        for (const arg of args) {
            if (arg instanceof Error) {
                if (!errorStack && arg.stack) {
                    errorStack = this.sanitize(arg.stack);
                }
            }
        }

        if (typeof args[0] === "string") {
            const firstArg = this.sanitize(args[0]);
            const hasPlaceholder = /%[sdjoO]/.test(firstArg);

            if (hasPlaceholder) {
                formattedParts.push(util.format(firstArg, ...args.slice(1)));
            } else {
                formattedParts.push(firstArg);
                for (let i = 1; i < args.length; i++) {
                    const arg = args[i];
                    if (arg instanceof Error) {
                        formattedParts.push(`${colors.red}${arg.message}${colors.reset}`);
                    } else if (typeof arg === "object" && arg !== null) {
                        formattedParts.push(util.inspect(arg, { colors: true, depth: 5, breakLength: 100 }));
                    } else {
                        formattedParts.push(String(arg));
                    }
                }
            }
        } else {
            for (const arg of args) {
                if (arg instanceof Error) {
                    formattedParts.push(`${colors.red}${arg.message}${colors.reset}`);
                } else if (typeof arg === "object" && arg !== null) {
                    formattedParts.push(util.inspect(arg, { colors: true, depth: 5, breakLength: 100 }));
                } else {
                    formattedParts.push(String(arg));
                }
            }
        }

        const fullText = this.sanitize(formattedParts.join(" ")).trim();

        let context = "";
        let message = fullText;

        // Matches [Context] or [Context]:
        const bracketMatch = fullText.match(/^\[([^\]]+)\]:?\s*(.*)/s);
        // Matches Context: (between 2 and 25 characters)
        const colonMatch = fullText.match(/^([a-zA-Z0-9_\-\s]{2,25}):\s*(.*)/s);

        if (bracketMatch) {
            context = bracketMatch[1]?.trim() ?? "";
            message = bracketMatch[2]?.trim() ?? "";
        } else if (colonMatch && colonMatch[1] && !colonMatch[1].toLowerCase().startsWith("http")) {
            context = colonMatch[1]?.trim() ?? "";
            message = colonMatch[2]?.trim() ?? "";
        }

        return { context, message, errorStack };
    }

    /**
     * Formats context tag with crisp bold brackets: [Context]
     */
    private static formatContext(context: string, color: string = colors.brightCyan): string {
        if (!context) return "";
        return ` ${colors.bold}${color}[${context}]${colors.reset}`;
    }

    /**
     * Indents multi-line log output cleanly
     */
    private static formatMultiline(message: string, prefixLength = 34): string {
        const lines = message.split("\n");
        if (lines.length <= 1) return message;
        const indent = " ".repeat(prefixLength);
        return lines.map((line, idx) => (idx === 0 ? line : `${indent}${line}`)).join("\n");
    }

    public static info(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.brightWhite}${colors.bgCyan}  INFO  ${colors.reset}`;
        const { context, message, errorStack } = this.parseArgs(args);
        const ctxStr = this.formatContext(context, colors.brightCyan);
        const output = `${timestamp} ${badge}${ctxStr} ${this.formatMultiline(message)}`;
        originalConsole.log(output);
        if (errorStack) originalConsole.log(`${colors.gray}${errorStack}${colors.reset}`);
    }

    public static success(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.brightWhite}${colors.bgBrightGreen}   OK   ${colors.reset}`;
        const { context, message, errorStack } = this.parseArgs(args);
        const ctxStr = this.formatContext(context, colors.brightGreen);
        const output = `${timestamp} ${badge}${ctxStr} ${this.formatMultiline(message)}`;
        originalConsole.log(output);
        if (errorStack) originalConsole.log(`${colors.gray}${errorStack}${colors.reset}`);
    }

    public static warn(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.blackText}${colors.bgYellow}  WARN  ${colors.reset}`;
        const { context, message, errorStack } = this.parseArgs(args);
        const ctxStr = this.formatContext(context, colors.brightYellow);
        const output = `${timestamp} ${badge}${ctxStr} ${colors.yellow}${this.formatMultiline(message)}${colors.reset}`;
        originalConsole.warn(output);
        if (errorStack) originalConsole.warn(`${colors.gray}${errorStack}${colors.reset}`);
    }

    public static error(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.brightWhite}${colors.bgRed} ERROR  ${colors.reset}`;
        const { context, message, errorStack } = this.parseArgs(args);
        const ctxStr = this.formatContext(context, colors.brightRed);
        const output = `${timestamp} ${badge}${ctxStr} ${colors.brightRed}${this.formatMultiline(message)}${colors.reset}`;
        originalConsole.error(output);
        if (errorStack) originalConsole.error(`${colors.gray}${errorStack}${colors.reset}`);
    }

    public static debug(...args: any[]): void {
        if (process.env.NODE_ENV === "production" && !process.env.DEBUG) return;
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.brightWhite}${colors.bgMagenta} DEBUG  ${colors.reset}`;
        const { context, message, errorStack } = this.parseArgs(args);
        const ctxStr = this.formatContext(context, colors.brightMagenta);
        const output = `${timestamp} ${badge}${ctxStr} ${colors.brightMagenta}${this.formatMultiline(message)}${colors.reset}`;
        originalConsole.log(output);
        if (errorStack) originalConsole.log(`${colors.gray}${errorStack}${colors.reset}`);
    }

    public static http(...args: any[]): void {
        const timestamp = this.getTimestamp();
        const badge = `${colors.bold}${colors.brightWhite}${colors.bgBrightBlue}  HTTP  ${colors.reset}`;
        const { context, message } = this.parseArgs(args);
        const ctxStr = context ? this.formatContext(context, colors.brightBlue) : this.formatContext("HTTP", colors.brightBlue);
        const output = `${timestamp} ${badge}${ctxStr} ${this.formatMultiline(message)}`;
        originalConsole.log(output);
    }

    /**
     * Replaces standard console logging methods so all console calls use Logger formatting
     */
    public static overrideConsole(): void {
        if (this.isConsoleOverridden) return;
        this.isConsoleOverridden = true;

        console.log = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("\x1b[4") || args[0].includes("\x1b[10"))) {
                originalConsole.log(...args);
                return;
            }
            this.info(...args);
        };

        console.info = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("\x1b[4") || args[0].includes("\x1b[10"))) {
                originalConsole.info(...args);
                return;
            }
            this.info(...args);
        };

        console.warn = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("\x1b[4") || args[0].includes("\x1b[10"))) {
                originalConsole.warn(...args);
                return;
            }
            this.warn(...args);
        };

        console.error = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("\x1b[4") || args[0].includes("\x1b[10"))) {
                originalConsole.error(...args);
                return;
            }
            this.error(...args);
        };

        console.debug = (...args) => {
            if (typeof args[0] === "string" && (args[0].includes("\x1b[4") || args[0].includes("\x1b[10"))) {
                originalConsole.debug(...args);
                return;
            }
            this.debug(...args);
        };

        this.success("Console logs successfully hooked into professional Logger system.");
    }
}

