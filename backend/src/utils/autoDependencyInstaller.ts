import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import crypto from "crypto";

const packageJsonPath = path.resolve(process.cwd(), "package.json");

/**
 * Computes the MD5 hash of package.json content to detect changes reliably.
 */
function getPackageHash(): string {
    try {
        const content = fs.readFileSync(packageJsonPath, "utf8");
        return crypto.createHash("md5").update(content).digest("hex");
    } catch (e) {
        return "";
    }
}

/**
 * Detects the appropriate package manager command to use based on lock files.
 */
function getInstallCommand(): string {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
        return "pnpm install";
    }
    if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
        return "yarn install";
    }
    return "npm install";
}

/**
 * Programmatically restarts the current process.
 * If running under a managed environment (Docker, PM2, tsx, nodemon), we exit gracefully
 * with code 0 to let the wrapper restart us. Otherwise, we spawn a detached clone.
 */
function restartProcess() {
    console.log(" Triggering process reload to activate new dependencies...\n");

    const isManaged = 
        process.env.PM2_HOME || 
        process.env.PM2_ID || 
        process.env.pm_id ||
        process.env.DOCKER_CONTAINER ||
        process.env.UNDER_DOCKER ||
        fs.existsSync("/.dockerenv") ||
        process.env.INIT_SYSTEM ||
        process.env.NODEMON ||
        (process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes("tsx"));

    if (isManaged) {
        console.log(" [DependencyWatcher] Process manager/wrapper detected. Exiting gracefully...");
        process.exit(0);
    } else {
        console.log(" [DependencyWatcher] Unmanaged process. Spawning a detached child and exiting...");
        const child = spawn(process.execPath, process.argv.slice(1), {
            detached: true,
            stdio: "inherit"
        } as any);
        (child as any).unref();
        process.exit(0);
    }
}

let lastHash = getPackageHash();
let isInstalling = false;

/**
 * Starts a background interval to check for package.json updates.
 * When changes are detected, it automatically runs the appropriate install command
 * and restarts the application to load the updated libraries.
 */
export function startDependencyWatcher() {
    if (process.env.AUTO_INSTALL_DEPS === "false") {
        return;
    }

    console.log("[DependencyWatcher] Live package.json monitor active.");

    setInterval(() => {
        if (isInstalling) return;

        const currentHash = getPackageHash();
        if (currentHash && currentHash !== lastHash) {
            console.log("\n [DependencyWatcher] package.json changes detected!");
            const installCmd = getInstallCommand();
            console.log(` Running '${installCmd}' in background...`);
            
            isInstalling = true;
            lastHash = currentHash;

            exec(installCmd, (error, stdout, stderr) => {
                isInstalling = false;
                if (error) {
                    console.error(" [DependencyWatcher] Installation failed:", error.message);
                    if (stderr) {
                        console.error(stderr);
                    }
                    return;
                }
                
                console.log(" [DependencyWatcher] Installation completed successfully!");
                if (stdout) {
                    console.log(stdout.trim());
                }

                restartProcess();
            });
        }
    }, 5000);
}

