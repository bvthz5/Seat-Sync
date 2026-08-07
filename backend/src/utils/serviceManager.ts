import { execSync, spawn } from "child_process";
import fs from "fs";
import net from "net";
import mysql2 from "mysql2/promise";

function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.on("connect", () => {
            socket.destroy();
            resolve(true);
        });
        socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
        });
        socket.on("error", () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
}

function isProcessRunning(processName: string): boolean {
    if (process.platform !== "win32") return true;
    try {
        const output = execSync(`tasklist /FI "IMAGENAME eq ${processName}"`, { encoding: "utf8" });
        return output.toLowerCase().includes(processName.toLowerCase());
    } catch {
        return false;
    }
}

async function canConnectToMySQL(host: string, port: number, user: string, pass: string): Promise<boolean> {
    try {
        const conn = await mysql2.createConnection({
            host,
            port,
            user,
            password: pass,
            connectTimeout: 2000,
        });
        await conn.end();
        return true;
    } catch {
        return false;
    }
}

export async function ensureServicesRunning() {
    // 1. First start Apache server silently if not running
    const isApacheRunning = isProcessRunning("httpd.exe") || (await isPortOpen("127.0.0.1", 80)) || (await isPortOpen("127.0.0.1", 443));
    if (!isApacheRunning) {
        console.log("[ServiceManager] Apache server is NOT running. Starting Apache silently in background...");
        if (fs.existsSync("C:\\xampp\\apache\\bin\\httpd.exe")) {
            spawn("C:\\xampp\\apache\\bin\\httpd.exe", [], {
                cwd: "C:\\xampp",
                detached: true,
                windowsHide: true,
                stdio: "ignore",
            }).unref();
        } else if (fs.existsSync("C:\\xampp\\apache_start.bat")) {
            spawn("cmd.exe", ["/c", "C:\\xampp\\apache_start.bat"], {
                cwd: "C:\\xampp",
                detached: true,
                windowsHide: true,
                stdio: "ignore",
            }).unref();
        } else {
            console.warn("[ServiceManager] XAMPP Apache executable not found.");
        }

        console.log("[ServiceManager] Waiting for Apache connection...");
        let attempts = 0;
        while (attempts < 15) {
            await new Promise((r) => setTimeout(r, 1000));
            const ready = (await isPortOpen("127.0.0.1", 80)) || (await isPortOpen("127.0.0.1", 443)) || isProcessRunning("httpd.exe");
            if (ready) {
                console.log("[ServiceManager] Apache server started & connected silently!");
                break;
            }
            attempts++;
        }
    } else {
        console.log("[ServiceManager] Apache server is already running & connected.");
    }

    // 2. ONLY AFTER Apache is connected, start MySQL server silently if not running
    const dbHost = process.env.DB_HOST || "127.0.0.1";
    const dbPort = Number(process.env.DB_PORT || 3306);
    const dbUser = process.env.DB_USER || "root";
    const dbPass = process.env.DB_PASS || "";

    const isMySQLReady = await canConnectToMySQL(dbHost, dbPort, dbUser, dbPass);

    if (!isMySQLReady) {
        console.log("[ServiceManager] MySQL server is NOT running/ready. Starting MySQL silently in background...");
        if (fs.existsSync("C:\\xampp\\mysql\\bin\\mysqld.exe")) {
            spawn("C:\\xampp\\mysql\\bin\\mysqld.exe", ["--defaults-file=mysql\\bin\\my.ini", "--standalone"], {
                cwd: "C:\\xampp",
                detached: true,
                windowsHide: true,
                stdio: "ignore",
            }).unref();
        } else if (fs.existsSync("C:\\xampp\\mysql_start.bat")) {
            spawn("cmd.exe", ["/c", "C:\\xampp\\mysql_start.bat"], {
                cwd: "C:\\xampp",
                detached: true,
                windowsHide: true,
                stdio: "ignore",
            }).unref();
        } else {
            console.warn("[ServiceManager] XAMPP MySQL executable not found.");
        }

        console.log("[ServiceManager] Waiting for MySQL connection...");
        let attempts = 0;
        while (attempts < 20) {
            await new Promise((r) => setTimeout(r, 1000));
            const ready = await canConnectToMySQL(dbHost, dbPort, dbUser, dbPass);
            if (ready) {
                console.log("[ServiceManager] MySQL server started & connected silently!");
                break;
            }
            attempts++;
        }
    } else {
        console.log("[ServiceManager] MySQL server is already running & connected.");
    }
}

export async function ensureDatabaseExists(dbName: string, dbUser: string, dbPass: string, dbHost: string, dbPort: number) {
    if (!dbName) return;
    console.log(`[ServiceManager] Auto-checking database '${dbName}' in MySQL...`);
    try {
        const conn = await mysql2.createConnection({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPass,
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await conn.end();
        console.log(`[ServiceManager] Database '${dbName}' auto-created / verified.`);
    } catch (err: any) {
        console.warn(`[ServiceManager] Database auto-creation notice:`, err.message);
    }
}
