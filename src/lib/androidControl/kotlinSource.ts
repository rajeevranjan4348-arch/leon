export interface KotlinSourceModule {
  filename: string;
  language: 'kotlin' | 'xml';
  description: string;
  code: string;
}

export const ANDROID_CONTROL_KOTLIN_FILES: KotlinSourceModule[] = [
  {
    filename: 'AndroidControlAccessibilityService.kt',
    language: 'kotlin',
    description: 'Core AccessibilityService running in the background to automate supported messaging apps.',
    code: `package com.gemini.ai.androidcontrol

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.gemini.ai.androidcontrol.adapters.*
import com.gemini.ai.androidcontrol.models.*

class AndroidControlAccessibilityService : AccessibilityService() {

    companion object {
        var instance: AndroidControlAccessibilityService? = null
            private set
        val isRunning: Boolean get() = instance != null
    }

    private val adapters = mapOf(
        "whatsapp" to WhatsAppMessagingAdapter(),
        "sms" to SMSMessagingAdapter(),
        "telegram" to TelegramMessagingAdapter()
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Active window state changes
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    /**
     * Finds editable input node and sets text via AccessibilityNodeInfo
     */
    fun enterText(targetResId: String, text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val nodes = root.findAccessibilityNodeInfosByViewId(targetResId)
        if (nodes.isNotEmpty()) {
            val node = nodes[0]
            val args = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
            }
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        }
        return false
    }

    /**
     * Clicks node matching resource ID or text
     */
    fun clickNode(targetResId: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val nodes = root.findAccessibilityNodeInfosByViewId(targetResId)
        if (nodes.isNotEmpty()) {
            val node = nodes[0]
            if (node.isClickable) return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                parent = parent.parent
            }
        }
        return false
    }
}`
  },
  {
    filename: 'MessagingAdapter.kt',
    language: 'kotlin',
    description: 'Interface contract for app-specific messaging automation.',
    code: `package com.gemini.ai.androidcontrol.adapters

import android.view.accessibility.AccessibilityNodeInfo

interface MessagingAdapter {
    val packageName: String
    val messageInputResId: String
    val sendButtonResId: String
    val searchButtonResId: String?

    fun findMessageInput(root: AccessibilityNodeInfo): AccessibilityNodeInfo?
    fun findSendButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo?
}`
  },
  {
    filename: 'WhatsAppMessagingAdapter.kt',
    language: 'kotlin',
    description: 'WhatsApp UI automation adapter with stable resource IDs.',
    code: `package com.gemini.ai.androidcontrol.adapters

import android.view.accessibility.AccessibilityNodeInfo

class WhatsAppMessagingAdapter : MessagingAdapter {
    override val packageName = "com.whatsapp"
    override val messageInputResId = "com.whatsapp:id/entry"
    override val sendButtonResId = "com.whatsapp:id/send"
    override val searchButtonResId = "com.whatsapp:id/menuitem_search"

    override fun findMessageInput(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val nodes = root.findAccessibilityNodeInfosByViewId(messageInputResId)
        return nodes.firstOrNull { it.isEditable }
    }

    override fun findSendButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val nodes = root.findAccessibilityNodeInfosByViewId(sendButtonResId)
        return nodes.firstOrNull { it.isClickable }
    }
}`
  },
  {
    filename: 'SMSMessagingAdapter.kt',
    language: 'kotlin',
    description: 'Default SMS / Google Messages UI automation adapter.',
    code: `package com.gemini.ai.androidcontrol.adapters

import android.view.accessibility.AccessibilityNodeInfo

class SMSMessagingAdapter : MessagingAdapter {
    override val packageName = "com.google.android.apps.messaging"
    override val messageInputResId = "com.google.android.apps.messaging:id/compose_message_text"
    override val sendButtonResId = "com.google.android.apps.messaging:id/send_message_button"
    override val searchButtonResId = "com.google.android.apps.messaging:id/start_chat_fab"

    override fun findMessageInput(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val nodes = root.findAccessibilityNodeInfosByViewId(messageInputResId)
        return nodes.firstOrNull { it.isEditable }
    }

    override fun findSendButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val nodes = root.findAccessibilityNodeInfosByViewId(sendButtonResId)
        return nodes.firstOrNull { it.isClickable }
    }
}`
  },
  {
    filename: 'AndroidControlBridgeInterface.kt',
    language: 'kotlin',
    description: 'WebView JavascriptInterface enabling bidirectional communication between Web AI UI and Android OS.',
    code: `package com.gemini.ai.androidcontrol.bridge

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import com.gemini.ai.androidcontrol.AndroidControlAccessibilityService
import org.json.JSONObject

class AndroidControlBridgeInterface(private val context: Context) {

    @JavascriptInterface
    fun isAccessibilityServiceEnabled(): Boolean {
        return AndroidControlAccessibilityService.isRunning
    }

    @JavascriptInterface
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun launchPackage(packageName: String): Boolean {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(launchIntent)
        return true
    }

    @JavascriptInterface
    fun performMessagingAction(actionJson: String): String {
        val json = JSONObject(actionJson)
        val action = json.optString("action")
        val app = json.optString("target_app")
        val contact = json.optString("contact")
        val message = json.optString("message")

        // Mandatory safety rule: Do not send without explicit user confirmation flag
        val requiresConfirmation = json.optBoolean("requires_confirmation", true)
        
        return JSONObject().apply {
            put("success", true)
            put("action", action)
            put("app", app)
            put("contact", contact)
            put("state", "WAITING_FOR_CONFIRMATION")
        }.toString()
    }
}`
  },
  {
    filename: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Declares AndroidControlAccessibilityService and BIND_ACCESSIBILITY_SERVICE permission.',
    code: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.READ_CONTACTS"/>
    <uses-permission android:name="android.permission.SEND_SMS"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application
        android:label="Gemini AI Assistant"
        android:theme="@style/Theme.AI">

        <service
            android:name=".AndroidControlAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">

            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService"/>
            </intent-filter>

            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config"/>
        </service>

    </application>

</manifest>`
  },
  {
    filename: 'accessibility_service_config.xml',
    language: 'xml',
    description: 'Configures AccessibilityService to interact with messaging applications window content.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true"
    android:notificationTimeout="100"
    android:packageNames="com.whatsapp,com.google.android.apps.messaging,org.telegram.messenger"
    android:description="@string/accessibility_description"/>`
  }
];
