// Raw Kotlin & XML Source Files for Universal Android App Opening System & Agent

export interface KotlinFile {
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const KOTLIN_SOURCE_FILES: KotlinFile[] = [
  {
    filename: 'UniversalAppLauncher.kt',
    language: 'kotlin',
    description: 'Centralized production-ready Android App Launcher utility. Dynamically resolves installed applications via PackageManager, caches results, matches aliases, handles special system apps, and launches apps directly without Play Store redirection.',
    code: `package com.gemini.phoneagent.launcher

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.provider.AlarmClock
import android.provider.ContactsContract
import android.provider.MediaStore
import android.provider.Settings
import org.json.JSONObject
import java.util.Locale

/**
 * Data class representing an installed launchable application.
 */
data class InstalledApp(
    val name: String,
    val packageName: String,
    val normalizedName: String,
    val aliases: List<String> = emptyList()
)

/**
 * Structured result model for package launch operations.
 */
data class PackageLaunchResult(
    val success: Boolean,
    val reason: String,
    val message: String
)

/**
 * Structured result model for app opening operations.
 */
data class UniversalAppLauncherResult(
    val success: Boolean,
    val action: String = "open_app",
    val app: String,
    val package_name: String? = null,
    val reason: String? = null,
    val message: String
) {
    fun toJson(): String {
        val json = JSONObject()
        json.put("success", success)
        json.put("action", action)
        json.put("app", app)
        if (package_name != null) json.put("package", package_name)
        if (reason != null) json.put("reason", reason)
        json.put("message", message)
        return json.toString()
    }
}

/**
 * In-memory thread-safe cache for installed launchable apps.
 */
object InstalledAppsCache {
    private var cachedApps: List<InstalledApp>? = null
    private var lastCacheTime: Long = 0
    private const val CACHE_TTL_MS: Long = 60_000 // 1 minute TTL

    @Synchronized
    fun get(context: Context, forceRefresh: Boolean = false): List<InstalledApp> {
        val now = System.currentTimeMillis()
        if (!forceRefresh && cachedApps != null && (now - lastCacheTime < CACHE_TTL_MS)) {
            return cachedApps!!
        }

        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos: List<ResolveInfo> = pm.queryIntentActivities(mainIntent, 0)
        val list = mutableListOf<InstalledApp>()

        for (info in resolveInfos) {
            val pkg = info.activityInfo.packageName
            val label = info.loadLabel(pm)?.toString() ?: pkg
            val normalized = UniversalAppLauncher.normalizeAppName(label)
            val aliases = UniversalAppLauncher.getStandardAliases(normalized)

            list.add(
                InstalledApp(
                    name = label,
                    packageName = pkg,
                    normalizedName = normalized,
                    aliases = aliases
                )
            )
        }

        cachedApps = list
        lastCacheTime = now
        return list
    }

    @Synchronized
    fun invalidate() {
        cachedApps = null
        lastCacheTime = 0
    }
}

/**
 * Centralized Universal App Launcher utility.
 */
object UniversalAppLauncher {

    fun getStandardAliases(normalizedName: String): List<String> {
        return when (normalizedName) {
            "whatsapp" -> listOf("wa", "whats app", "whatsup", "watsapp", "whatsapp messenger")
            "instagram" -> listOf("ig", "insta", "gram", "instagram app")
            "youtube" -> listOf("yt", "you tube", "youtube app", "videos")
            "google chrome", "chrome" -> listOf("chrome", "browser", "web browser", "internet", "google chrome")
            "telegram" -> listOf("tg", "telegram app", "telegram messenger")
            "google maps", "maps" -> listOf("maps", "gmaps", "gmap", "navigation", "gps", "google maps")
            "gmail" -> listOf("mail", "email", "google mail", "g-mail", "inbox")
            "settings" -> listOf("phone settings", "system settings", "preferences", "config", "gear")
            "camera" -> listOf("cam", "photo camera", "phone camera", "take photo", "selfie camera")
            "calculator" -> listOf("calc", "math calculator", "the calculator")
            "contacts" -> listOf("people", "address book", "phonebook")
            "phone" -> listOf("dialer", "telephone", "keypad", "call app")
            "messages" -> listOf("sms", "text messages", "messaging", "texts")
            "files", "files by google" -> listOf("file manager", "file explorer", "my files", "downloads")
            "clock" -> listOf("alarm", "timer", "stopwatch", "alarms")
            "calendar", "google calendar" -> listOf("calendar", "schedule", "agenda", "cal")
            "spotify" -> listOf("spotify music", "music app", "songs")
            else -> emptyList()
        }
    }

    fun normalizeAppName(input: String): String {
        return input.lowercase(Locale.ROOT)
            .trim()
            .replace(Regex("^(?:hey\\\\s+(?:ai|assistant)\\\\s+|can\\\\s+you\\\\s+|please\\\\s+|could\\\\s+you\\\\s+|i\\\\s+want\\\\s+to\\\\s+)?(?:open|launch|start|run|go\\\\s+to|bring\\\\s+up)\\\\s+(?:the\\\\s+|my\\\\s+)?"), "")
            .replace(Regex("\\\\s+(?:app|application|on\\\\s+my\\\\s+phone|for\\\\s+me|now)$"), "")
            .replace(Regex("[^a-z0-9\\\\s]"), " ")
            .replace(Regex("\\\\s+"), " ")
            .trim()
    }

    fun extractAppName(command: String): String? {
        val trimmed = command.trim()
        val match = Regex(
            "^(?:hey\\\\s+(?:ai|assistant)\\\\s+|can\\\\s+you\\\\s+|please\\\\s+|could\\\\s+you\\\\s+|i\\\\s+want\\\\s+to\\\\s+)?(?:open|launch|start|run|go\\\\s+to|bring\\\\s+up)\\\\s+(?:the\\\\s+|my\\\\s+)?([a-zA-Z0-9\\\\s._-]+?)(?:\\\\s+app|\\\\s+application|\\\\s+for\\\\s+me|\\\\s+now)?$",
            RegexOption.IGNORE_CASE
        ).find(trimmed)

        return match?.groupValues?.get(1)?.let { normalizeAppName(it) } ?: normalizeAppName(trimmed).takeIf { it.isNotBlank() }
    }

    fun getInstalledLaunchableApps(context: Context): List<InstalledApp> {
        return InstalledAppsCache.get(context)
    }

    fun resolveApp(context: Context, appNameQuery: String): InstalledApp? {
        val normalized = normalizeAppName(appNameQuery)
        if (normalized.isBlank()) return null

        val apps = getInstalledLaunchableApps(context)

        // 1. Direct package match
        val pkgMatch = apps.firstOrNull { it.packageName.equals(appNameQuery.trim(), ignoreCase = true) }
        if (pkgMatch != null) return pkgMatch

        // 2. Exact display name match
        val exactMatch = apps.firstOrNull { it.name.equals(appNameQuery.trim(), ignoreCase = true) }
        if (exactMatch != null) return exactMatch

        // 3. Normalized name match
        val normMatch = apps.firstOrNull { it.normalizedName == normalized }
        if (normMatch != null) return normMatch

        // 4. Alias match
        val aliasMatch = apps.firstOrNull { app ->
            app.aliases.any { alias -> normalizeAppName(alias) == normalized }
        }
        if (aliasMatch != null) return aliasMatch

        // 5. Prefix / Substring match
        val subMatch = apps.firstOrNull { app ->
            app.normalizedName.startsWith(normalized) || normalized.startsWith(app.normalizedName)
        }
        return subMatch
    }

    fun launchPackage(context: Context, packageName: String): PackageLaunchResult {
        val cleanPkg = packageName.trim()
        if (cleanPkg.isBlank()) {
            return PackageLaunchResult(
                success = false,
                reason = "NO_LAUNCH_INTENT",
                message = "Package name cannot be blank."
            )
        }

        return try {
            val pm = context.packageManager
            // Retrieve default launcher intent for the package
            val intent = pm.getLaunchIntentForPackage(cleanPkg)
            if (intent == null) {
                // Intent is null: app does not have a MAIN/LAUNCHER activity or package is disabled
                PackageLaunchResult(
                    success = false,
                    reason = "NO_LAUNCH_INTENT",
                    message = "No launchable activity found for package: $cleanPkg"
                )
            } else {
                // Secure intent configuration with FLAG_ACTIVITY_NEW_TASK
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                intent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)

                // Verify activity resolution to safeguard against runtime crashes
                val resolveInfo = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    pm.resolveActivity(intent, PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY.toLong()))
                } else {
                    @Suppress("DEPRECATION")
                    pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
                }

                if (resolveInfo == null) {
                    PackageLaunchResult(
                        success = false,
                        reason = "ACTIVITY_NOT_FOUND",
                        message = "Unable to resolve target activity for package: $cleanPkg"
                    )
                } else {
                    context.startActivity(intent)
                    PackageLaunchResult(
                        success = true,
                        reason = "SUCCESS",
                        message = "Successfully launched $cleanPkg"
                    )
                }
            }
        } catch (e: SecurityException) {
            PackageLaunchResult(
                success = false,
                reason = "PERMISSION_ERROR",
                message = "Permission denied while attempting to launch $cleanPkg: \${e.localizedMessage}"
            )
        } catch (e: android.content.ActivityNotFoundException) {
            PackageLaunchResult(
                success = false,
                reason = "ACTIVITY_NOT_FOUND",
                message = "Activity not found for package $cleanPkg: \${e.localizedMessage}"
            )
        } catch (e: NullPointerException) {
            PackageLaunchResult(
                success = false,
                reason = "NULL_INTENT_ERROR",
                message = "Null pointer encountered while building launch intent for $cleanPkg: \${e.localizedMessage}"
            )
        } catch (e: Throwable) {
            PackageLaunchResult(
                success = false,
                reason = "LAUNCH_FAILED",
                message = "Failed to launch $cleanPkg: \${e.localizedMessage ?: "Unknown error"}"
            )
        }
    }

    fun openSpecialSystemApp(context: Context, systemApp: String): Boolean {
        return try {
            val intent = when (normalizeAppName(systemApp)) {
                "settings" -> Intent(Settings.ACTION_SETTINGS)
                "camera" -> Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                "phone", "dialer" -> Intent(Intent.ACTION_DIAL)
                "contacts" -> Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.CONTENT_URI)
                "messages", "sms" -> Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MESSAGING)
                "calculator" -> Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_CALCULATOR)
                "clock", "alarm" -> Intent(AlarmClock.ACTION_SHOW_ALARMS)
                "calendar" -> Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_CALENDAR)
                else -> null
            }

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    fun openPlayStoreFallback(context: Context, packageNameOrQuery: String): Boolean {
        return try {
            val uri = if (packageNameOrQuery.contains(".")) {
                Uri.parse("market://details?id=$packageNameOrQuery")
            } else {
                Uri.parse("market://search?q=\${Uri.encode(packageNameOrQuery)}")
            }
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            val webUri = if (packageNameOrQuery.contains(".")) {
                Uri.parse("https://play.google.com/store/apps/details?id=$packageNameOrQuery")
            } else {
                Uri.parse("https://play.google.com/store/search?q=\${Uri.encode(packageNameOrQuery)}&c=apps")
            }
            val webIntent = Intent(Intent.ACTION_VIEW, webUri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(webIntent)
            true
        }
    }

    /**
     * Primary entry point for launching apps from AI voice/text commands.
     * Enforces the rule: if app is installed, open directly. Never redirect to Play Store first!
     */
    fun launchApp(context: Context, appNameOrPackage: String): UniversalAppLauncherResult {
        val clean = appNameOrPackage.trim()
        if (clean.isBlank()) {
            return UniversalAppLauncherResult(
                success = false,
                app = "",
                reason = "APP_NOT_INSTALLED",
                message = "Please specify an application name."
            )
        }

        // 1. Resolve application
        val resolved = resolveApp(context, clean)

        if (resolved == null) {
            // Check special system intents
            val handledSpecial = openSpecialSystemApp(context, clean)
            if (handledSpecial) {
                return UniversalAppLauncherResult(
                    success = true,
                    app = clean,
                    reason = "SUCCESS",
                    message = "Opened $clean directly."
                )
            }

            return UniversalAppLauncherResult(
                success = false,
                app = clean,
                reason = "APP_NOT_INSTALLED",
                message = "$clean isn't installed on this device."
            )
        }

        // 2. Direct Package Launch with secure intent handling
        val launchRes = launchPackage(context, resolved.packageName)
        if (launchRes.success) {
            return UniversalAppLauncherResult(
                success = true,
                app = resolved.name,
                package_name = resolved.packageName,
                reason = "SUCCESS",
                message = "Opening \${resolved.name} directly."
            )
        }

        // Try special system intent as secondary fallback before failing
        val specialLaunched = openSpecialSystemApp(context, resolved.name)
        if (specialLaunched) {
            return UniversalAppLauncherResult(
                success = true,
                app = resolved.name,
                package_name = resolved.packageName,
                reason = "SUCCESS",
                message = "Opening \${resolved.name} directly."
            )
        }

        return UniversalAppLauncherResult(
            success = false,
            app = resolved.name,
            package_name = resolved.packageName,
            reason = launchRes.reason,
            message = launchRes.message
        )
    }
}`
  },
  {
    filename: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Android WebView host activity injecting JavaScriptInterface bridge for UniversalAppLauncher.',
    code: `package com.gemini.phoneagent

import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.gemini.phoneagent.launcher.UniversalAppLauncher
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true

        // Register Native JavaScriptInterface Bridge for UniversalAppLauncher
        webView.addJavascriptInterface(AppLauncherBridge(), "AndroidAppLauncher")

        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/index.html")
    }

    inner class AppLauncherBridge {

        @JavascriptInterface
        fun getInstalledAppsJson(): String {
            val apps = UniversalAppLauncher.getInstalledLaunchableApps(this@MainActivity)
            val jsonArray = JSONArray()
            for (app in apps) {
                val obj = JSONObject().apply {
                    put("name", app.name)
                    put("packageName", app.packageName)
                    put("normalizedName", app.normalizedName)
                    put("launchable", true)
                }
                jsonArray.put(obj)
            }
            return jsonArray.toString()
        }

        @JavascriptInterface
        fun launchAppByPackage(packageName: String): String {
            val result = UniversalAppLauncher.launchPackage(this@MainActivity, packageName)
            val obj = JSONObject().apply {
                put("success", result.success)
                put("package", packageName)
                put("reason", result.reason)
                put("message", result.message)
            }
            return obj.toString()
        }

        @JavascriptInterface
        fun launchAppByName(appName: String): String {
            val result = UniversalAppLauncher.launchApp(this@MainActivity, appName)
            return result.toJson()
        }

        @JavascriptInterface
        fun openPlayStore(packageNameOrQuery: String): Boolean {
            return UniversalAppLauncher.openPlayStoreFallback(this@MainActivity, packageNameOrQuery)
        }

        @JavascriptInterface
        fun isAppInstalled(packageName: String): Boolean {
            val apps = UniversalAppLauncher.getInstalledLaunchableApps(this@MainActivity)
            return apps.any { it.packageName.equals(packageName, ignoreCase = true) }
        }
    }
}`
  },
  {
    filename: 'AppResolver.kt',
    language: 'kotlin',
    description: 'Utility class connecting intent resolution to UniversalAppLauncher.',
    code: `package com.gemini.phoneagent.resolver

import android.content.Context
import android.content.Intent
import com.gemini.phoneagent.launcher.InstalledApp
import com.gemini.phoneagent.launcher.UniversalAppLauncher

data class AppInfo(
    val name: String,
    val packageName: String,
    val isSystemApp: Boolean = false
)

data class ResolvedAppResult(
    val success: Boolean,
    val appInfo: AppInfo? = null,
    val launchIntent: Intent? = null,
    val errorMessage: String? = null
)

class AppResolver(
    private val context: Context
) {
    fun getLaunchableApps(forceRefresh: Boolean = false): List<InstalledApp> {
        return UniversalAppLauncher.getInstalledLaunchableApps(context)
    }

    fun getPackageName(appNameQuery: String): String? {
        val app = UniversalAppLauncher.resolveApp(context, appNameQuery)
        return app?.packageName
    }

    fun resolveApp(appNameQuery: String): ResolvedAppResult {
        val app = UniversalAppLauncher.resolveApp(context, appNameQuery)
            ?: return ResolvedAppResult(
                success = false,
                errorMessage = "App '\$appNameQuery' is not installed."
            )

        val intent = context.packageManager.getLaunchIntentForPackage(app.packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        return ResolvedAppResult(
            success = true,
            appInfo = AppInfo(name = app.name, packageName = app.packageName),
            launchIntent = intent
        )
    }
}`
  },
  {
    filename: 'AppController.kt',
    language: 'kotlin',
    description: 'Launches target Android packages via UniversalAppLauncher.',
    code: `package com.gemini.phoneagent.controller

import android.content.Context
import com.gemini.phoneagent.launcher.UniversalAppLauncher

class AppController(
    private val context: Context
) {
    fun openApp(packageName: String): Boolean {
        return UniversalAppLauncher.launchPackage(context, packageName)
    }

    fun openAppByName(appName: String): Boolean {
        val res = UniversalAppLauncher.launchApp(context, appName)
        return res.success
    }
}`
  },
  {
    filename: 'ActionExecutor.kt',
    language: 'kotlin',
    description: 'Executes validated action requests using UniversalAppLauncher.',
    code: `package com.gemini.phoneagent.executor

import android.content.Context
import com.gemini.phoneagent.controller.*
import com.gemini.phoneagent.finder.NodeFinder
import com.gemini.phoneagent.launcher.UniversalAppLauncher
import com.gemini.phoneagent.models.*
import com.gemini.phoneagent.service.AIAccessibilityService
import kotlinx.coroutines.delay

class ActionExecutor(
    private val context: Context,
    private val service: AIAccessibilityService
) {

    suspend fun execute(action: ActionRequest): ExecutionResult {
        return when (action.type) {
            "back" -> {
                val result = service.goBack()
                ExecutionResult(result, "Back pressed")
            }
            "home" -> {
                val result = service.goHome()
                ExecutionResult(result, "Home pressed")
            }
            "recents" -> {
                val result = service.openRecents()
                ExecutionResult(result, "Recents opened")
            }
            "open_app" -> {
                val target = action.target ?: return ExecutionResult(false, "App name required")
                val res = UniversalAppLauncher.launchApp(context, target)
                ExecutionResult(res.success, res.message)
            }
            "click_text" -> {
                val root = service.rootInActiveWindow
                    ?: return ExecutionResult(false, "Screen unavailable")

                val success = NodeFinder().clickText(root, action.text ?: "")
                ExecutionResult(success, if (success) "Element clicked" else "Element not found")
            }
            "type_text" -> {
                val root = service.rootInActiveWindow
                    ?: return ExecutionResult(false, "Screen unavailable")

                val node = NodeFinder().findEditable(root)
                    ?: return ExecutionResult(false, "Input field not found")

                val success = TextController().typeText(node, action.text ?: "")
                ExecutionResult(success, if (success) "Text entered" else "Could not type text")
            }
            "swipe" -> {
                val gesture = GestureController(service)
                gesture.swipe(
                    action.startX ?: 0f,
                    action.startY ?: 0f,
                    action.endX ?: 0f,
                    action.endY ?: 0f
                )
                ExecutionResult(true, "Swipe completed")
            }
            "wait" -> {
                delay(500)
                ExecutionResult(true, "Wait completed")
            }
            else -> ExecutionResult(false, "Unknown action")
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
  },
  {
    filename: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Declares package visibility queries for launchable apps and AccessibilityService configuration.',
    code: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Option A: Declare intent filter queries for launchable apps (Recommended) -->
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>

    <!-- Option B: Broad package query (Restricted by Google Play Store policy; use only if required) -->
    <!-- <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" /> -->

    <application
        android:theme="@style/Theme.AI"
        android:label="My AI">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".accessibility.AIAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">

            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>

            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />

        </service>

    </application>

</manifest>`
  },
  {
    filename: 'accessibility_service_config.xml',
    language: 'xml',
    description: 'XML configuration defining event types, feedback generic, and gesture capability.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true"
    android:notificationTimeout="100"
    android:description="@string/app_name"/>`
  }
];
