/**
 * Production Kotlin Native Android Source Files
 * 
 * Implements:
 * 1. AndroidAppLauncherService.kt - PackageManager dynamic query, launcher activity discovery, and intent dispatch.
 * 2. InstalledAppRegistry.kt - In-memory thread-safe cache with BroadcastReceiver invalidation.
 * 3. PackageChangeReceiver.kt - Listens to PACKAGE_ADDED / PACKAGE_REMOVED to auto-refresh registry off main thread.
 * 4. AndroidAppLauncherBridge.kt - JavaScriptInterface for WebView two-way communication.
 */

export interface AndroidLauncherKotlinModule {
  filename: string;
  language: 'kotlin' | 'xml';
  description: string;
  code: string;
}

export const ANDROID_LAUNCHER_KOTLIN_FILES: AndroidLauncherKotlinModule[] = [
  {
    filename: 'AndroidAppLauncher.kt',
    language: 'kotlin',
    description: 'Dynamic Android PackageManager Launcher Service querying all installed apps exposing a launcher activity.',
    code: `package com.gemini.ai.launcher

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

data class InstalledApp(
    val name: String,
    val packageName: String,
    val activityName: String?,
    val isSystemApp: Boolean,
    val launchable: Boolean
)

class AndroidAppLauncher(private val context: Context) {

    companion object {
        private const val TAG = "UniversalAppLauncher"
        @Volatile private var instance: AndroidAppLauncher? = null

        fun getInstance(context: Context): AndroidAppLauncher =
            instance ?: synchronized(this) {
                instance ?: AndroidAppLauncher(context.applicationContext).also { instance = it }
            }
    }

    private val packageManager: PackageManager = context.packageManager
    private val appCache = ConcurrentHashMap<String, InstalledApp>()
    @Volatile private var isCacheDirty = true

    /**
     * Query all launchable applications dynamically from Android PackageManager
     */
    suspend fun getInstalledApps(forceRefresh: Boolean = false): List<InstalledApp> = withContext(Dispatchers.IO) {
        if (!forceRefresh && !isCacheDirty && appCache.isNotEmpty()) {
            return@withContext appCache.values.toList()
        }

        try {
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val resolveInfos: List<ResolveInfo> = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                packageManager.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                packageManager.queryIntentActivities(mainIntent, 0)
            }

            appCache.clear()

            for (info in resolveInfos) {
                val appInfo = info.activityInfo.applicationInfo
                val label = info.loadLabel(packageManager)?.toString() ?: appInfo.packageName
                val pkgName = appInfo.packageName
                val activityName = info.activityInfo.name
                val isSystem = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0

                val app = InstalledApp(
                    name = label,
                    packageName = pkgName,
                    activityName = activityName,
                    isSystemApp = isSystem,
                    launchable = true
                )
                appCache[pkgName] = app
            }

            isCacheDirty = false
            Log.d(TAG, "Discovered \${appCache.size} launchable Android applications.")
        } catch (e: Exception) {
            Log.e(TAG, "Error querying installed applications: \${e.message}", e)
        }

        appCache.values.toList()
    }

    fun invalidateCache() {
        isCacheDirty = true
    }

    /**
     * Launches the application by package name using getLaunchIntentForPackage
     */
    fun launchApp(packageName: String): JSONObject {
        val result = JSONObject()
        val cleanPkg = packageName.trim()

        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(cleanPkg)

            if (launchIntent == null) {
                result.put("success", false)
                result.put("reason", "NO_LAUNCH_INTENT")
                result.put("packageName", cleanPkg)
                result.put("message", "No launchable activity found for $cleanPkg")
                result.put("playStoreUrl", "https://play.google.com/store/apps/details?id=$cleanPkg")
                return result
            }

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            context.startActivity(launchIntent)

            result.put("success", true)
            result.put("reason", "SUCCESS")
            result.put("packageName", cleanPkg)
            result.put("message", "Application launched successfully")
        } catch (e: ActivityNotFoundException) {
            Log.w(TAG, "Activity not found for package: $cleanPkg", e)
            result.put("success", false)
            result.put("reason", "ACTIVITY_NOT_FOUND")
            result.put("packageName", cleanPkg)
            result.put("message", "Activity not found on device")
            result.put("playStoreUrl", "https://play.google.com/store/apps/details?id=$cleanPkg")
        } catch (e: SecurityException) {
            Log.e(TAG, "Security permission error launching $cleanPkg: \${e.message}", e)
            result.put("success", false)
            result.put("reason", "PERMISSION_ERROR")
            result.put("packageName", cleanPkg)
            result.put("message", "Security exception launching package")
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error launching $cleanPkg: \${e.message}", e)
            result.put("success", false)
            result.put("reason", "UNKNOWN_ERROR")
            result.put("packageName", cleanPkg)
            result.put("message", e.message ?: "Unknown error")
        }

        return result
    }

    /**
     * Opens Play Store listing with market:// intent and web fallback
     */
    fun openPlayStore(packageName: String): Boolean {
        return try {
            val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(marketIntent)
            true
        } catch (e: ActivityNotFoundException) {
            try {
                val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$packageName")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(webIntent)
                true
            } catch (ex: Exception) {
                false
            }
        }
    }
}`
  },
  {
    filename: 'AndroidAppLauncherBridge.kt',
    language: 'kotlin',
    description: 'JavaScriptInterface bridge exposed to WebView providing real-time queries and launches.',
    code: `package com.gemini.ai.launcher.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import com.gemini.ai.launcher.AndroidAppLauncher
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject

class AndroidAppLauncherBridge(private val context: Context) {

    private val launcher = AndroidAppLauncher.getInstance(context)

    @JavascriptInterface
    fun getInstalledAppsJson(): String {
        return runBlocking {
            val apps = launcher.getInstalledApps()
            val array = JSONArray()
            for (app in apps) {
                val obj = JSONObject().apply {
                    put("name", app.name)
                    put("packageName", app.packageName)
                    put("activityName", app.activityName)
                    put("isSystemApp", app.isSystemApp)
                    put("launchable", app.launchable)
                }
                array.put(obj)
            }
            array.toString()
        }
    }

    @JavascriptInterface
    fun searchInstalledAppsJson(query: String): String {
        return runBlocking {
            val apps = launcher.getInstalledApps()
            val q = query.trim().lowercase()
            val array = JSONArray()
            for (app in apps) {
                if (app.name.lowercase().contains(q) || app.packageName.lowercase().contains(q)) {
                    val obj = JSONObject().apply {
                        put("name", app.name)
                        put("packageName", app.packageName)
                        put("activityName", app.activityName)
                        put("launchable", app.launchable)
                    }
                    array.put(obj)
                }
            }
            array.toString()
        }
    }

    @JavascriptInterface
    fun launchAppByPackage(packageName: String): String {
        val result = launcher.launchApp(packageName)
        return result.toString()
    }

    @JavascriptInterface
    fun openPlayStore(packageName: String): Boolean {
        return launcher.openPlayStore(packageName)
    }

    @JavascriptInterface
    fun refreshInstalledApps(): Boolean {
        launcher.invalidateCache()
        return true
    }
}`
  },
  {
    filename: 'PackageChangeReceiver.kt',
    language: 'kotlin',
    description: 'BroadcastReceiver that automatically refreshes the app registry when apps are installed or removed.',
    code: `package com.gemini.ai.launcher.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.gemini.ai.launcher.AndroidAppLauncher

class PackageChangeReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        val packageName = intent.data?.schemeSpecificPart

        when (action) {
            Intent.ACTION_PACKAGE_ADDED,
            Intent.ACTION_PACKAGE_REMOVED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                Log.d("PackageChangeReceiver", "Detected package change: $action for $packageName. Invalidating cache.")
                AndroidAppLauncher.getInstance(context).invalidateCache()
            }
        }
    }
}`
  },
  {
    filename: 'AppLauncherService.kt',
    language: 'kotlin',
    description: 'Safe Android App Launcher Service with coroutines, alias normalization, PackageManager launcher intent querying, and sealed LaunchResult handling.',
    code: `package com.agent.system.launcher

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed class LaunchResult {
    data class Success(val appName: String, val packageName: String) : LaunchResult()
    data class NotInstalled(val query: String) : LaunchResult()
    data class NotLaunchable(val appName: String, val packageName: String) : LaunchResult()
    data class PermissionDenied(val appName: String, val requiredPermission: String) : LaunchResult()
    data class Failure(val appName: String, val error: Throwable) : LaunchResult()
}

class AppLauncherService(private val context: Context) {

    private val packageManager: PackageManager get() = context.packageManager

    // Built-in alias map for common shorthand notations
    private val standardAliases = mapOf(
        "wa" to "whatsapp",
        "yt" to "youtube",
        "chrome" to "google chrome",
        "maps" to "google maps",
        "gm" to "gmail"
    )

    suspend fun launchApp(rawQuery: String): LaunchResult = withContext(Dispatchers.Default) {
        val normalizedQuery = normalize(rawQuery)
        val resolvedQuery = standardAliases[normalizedQuery] ?: normalizedQuery

        // 1. Fetch launchable applications
        val launchIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfoList = packageManager.queryIntentActivities(launchIntent, 0)

        // 2. Dynamic matching against application label and package name
        val matchedResolveInfo = resolveInfoList.firstOrNull { resolveInfo ->
            val label = normalize(resolveInfo.loadLabel(packageManager).toString())
            val pkg = normalize(resolveInfo.activityInfo.packageName)
            label == resolvedQuery || pkg == resolvedQuery || label.contains(resolvedQuery)
        }

        if (matchedResolveInfo == null) {
            return@withContext LaunchResult.NotInstalled(rawQuery)
        }

        val packageName = matchedResolveInfo.activityInfo.packageName
        val appLabel = matchedResolveInfo.loadLabel(packageManager).toString()

        // 3. Resolve launch intent
        val appLaunchIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?: return@withContext LaunchResult.NotLaunchable(appLabel, packageName)

        appLaunchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)

        // 4. Safe execution
        return@withContext try {
            context.startActivity(appLaunchIntent)
            LaunchResult.Success(appName = appLabel, packageName = packageName)
        } catch (securityEx: SecurityException) {
            LaunchResult.PermissionDenied(appLabel, securityEx.message ?: "Security restriction")
        } catch (ex: Exception) {
            LaunchResult.Failure(appLabel, ex)
        }
    }

    private fun normalize(input: String): String {
        return input.trim()
            .lowercase()
            .replace(Regex("[^a-z0-9\\\\s]"), "")
            .replace(Regex("\\\\s+"), " ")
    }
}`
  }
];
