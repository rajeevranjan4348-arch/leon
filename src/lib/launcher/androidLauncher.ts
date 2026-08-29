/**
 * androidLauncher.ts
 * Launch and manage Android apps on a connected device/emulator via ADB.
 * Requires: adb installed and on PATH (Android Platform Tools), USB debugging enabled.
 */

export interface AndroidDevice {
  id: string;
  state: "device" | "offline" | "unauthorized";
}

export interface AndroidApp {
  packageName: string;
  label?: string;
}

// Dynamically handle child_process to ensure compatibility in both Node environments and browser Vite bundles
async function runExecFile(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  if (typeof window !== "undefined") {
    // Browser runtime environment guard
    throw new Error("ADB commands require a Node.js server environment with adb installed on PATH.");
  }

  try {
    const cp = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(cp.execFile);
    return await execFileAsync(command, args);
  } catch (err: any) {
    throw new Error(`Failed to execute ADB command '${command} ${args.join(" ")}': ${err.message || err}`);
  }
}

function deviceArgs(deviceId?: string): string[] {
  return deviceId ? ["-s", deviceId] : [];
}

/** List connected devices/emulators */
export async function listDevices(): Promise<AndroidDevice[]> {
  try {
    const { stdout } = await runExecFile("adb", ["devices"]);
    return stdout
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, state] = line.split(/\s+/);
        return { id, state: state as AndroidDevice["state"] };
      });
  } catch {
    return [];
  }
}

/** List installed package names on the device (third-party apps only by default) */
export async function listInstalledPackages(
  deviceId?: string,
  thirdPartyOnly = true
): Promise<string[]> {
  const args = deviceArgs(deviceId).concat([
    "shell",
    "pm",
    "list",
    "packages",
    ...(thirdPartyOnly ? ["-3"] : []),
  ]);
  try {
    const { stdout } = await runExecFile("adb", args);
    return stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("package:"))
      .map((l) => l.replace("package:", ""));
  } catch {
    return [];
  }
}

/**
 * Get the launchable activity for a package, e.g. "com.android.chrome/com.google.android.apps.chrome.Main"
 */
async function getLaunchActivity(
  packageName: string,
  deviceId?: string
): Promise<string | null> {
  const args = deviceArgs(deviceId).concat([
    "shell",
    "cmd",
    "package",
    "resolve-activity",
    "--brief",
    packageName,
  ]);
  try {
    const { stdout } = await runExecFile("adb", args);
    const lines = stdout.trim().split("\n");
    const activityLine = lines[lines.length - 1].trim();
    if (activityLine.includes("/")) return activityLine;
    return null;
  } catch {
    return null;
  }
}

/**
 * Launch an Android app by package name.
 * Tries `monkey` (simplest, works even without knowing the activity),
 * falls back to explicit activity resolution + `am start`.
 */
export async function launchApp(
  packageName: string,
  deviceId?: string
): Promise<{ success: boolean; method: string; error?: string }> {
  // Method 1: monkey — launches the app's default launcher activity
  try {
    const args = deviceArgs(deviceId).concat([
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    ]);
    const { stdout, stderr } = await runExecFile("adb", args);
    if (!/no activities found/i.test(stdout + stderr)) {
      return { success: true, method: "monkey" };
    }
  } catch {
    // fall through to method 2
  }

  // Method 2: resolve activity, then am start
  const activity = await getLaunchActivity(packageName, deviceId);
  if (activity) {
    try {
      const args = deviceArgs(deviceId).concat(["shell", "am", "start", "-n", activity]);
      await runExecFile("adb", args);
      return { success: true, method: "am start" };
    } catch (err: any) {
      return { success: false, method: "am start", error: err.message };
    }
  }

  return {
    success: false,
    method: "none",
    error: `Could not resolve a launchable activity for ${packageName}`,
  };
}

/** Force-stop an app */
export async function stopApp(packageName: string, deviceId?: string): Promise<void> {
  const args = deviceArgs(deviceId).concat(["shell", "am", "force-stop", packageName]);
  try {
    await runExecFile("adb", args);
  } catch {
    // Ignore error if stopping failed
  }
}

/** Get the currently focused app's package name (useful to confirm launch succeeded) */
export async function getForegroundPackage(deviceId?: string): Promise<string | null> {
  const args = deviceArgs(deviceId).concat([
    "shell",
    "dumpsys",
    "window",
    "windows",
  ]);
  try {
    const { stdout } = await runExecFile("adb", args);
    const match = stdout.match(/mCurrentFocus=.*?\s([a-zA-Z0-9._]+)\/[a-zA-Z0-9._]+/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
