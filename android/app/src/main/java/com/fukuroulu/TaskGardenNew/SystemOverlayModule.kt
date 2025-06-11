package com.fukuroulu.TaskGardenNew

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = "SystemOverlay")
class SystemOverlayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var overlayView: View? = null
    private var windowManager: WindowManager? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    override fun getName(): String {
        return "SystemOverlay"
    }

    @ReactMethod
    fun showOverlay(opacity: Double, promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            // Check permission first
            if (!checkOverlayPermission()) {
                promise.reject("NO_PERMISSION", "Overlay permission not granted")
                return
            }

            activity.runOnUiThread {
                try {
                    // First hide any existing overlay
                    overlayView?.let { view ->
                        windowManager?.removeView(view)
                        overlayView = null
                        windowManager = null
                        layoutParams = null
                    }
                    // Then create and show new overlay
                    createAndShowOverlay(activity, opacity, promise)
                } catch (e: Exception) {
                    createAndShowOverlay(activity, opacity, promise)
                }
            }
        } catch (e: Exception) {
            promise.reject("SHOW_OVERLAY_ERROR", e.message, e)
        }
    }

    private fun createAndShowOverlay(activity: Activity, opacity: Double, promise: Promise) {
        try {
            android.util.Log.d("SystemOverlay", "Creating overlay with opacity: $opacity")
            windowManager = activity.getSystemService(Context.WINDOW_SERVICE) as WindowManager

            // Create overlay view
            overlayView = FrameLayout(activity).apply {
                setBackgroundColor(Color.argb((opacity * 255).toInt(), 0, 0, 0))
                isClickable = false
                isFocusable = false
            }
            android.util.Log.d("SystemOverlay", "Overlay view created")

            // Set layout parameters for system overlay
            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
            }

            layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_LAYOUT_INSET_DECOR or
                        WindowManager.LayoutParams.FLAG_FULLSCREEN or
                        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT
            )

            // Add overlay to window manager
            windowManager?.addView(overlayView, layoutParams)
            android.util.Log.d("SystemOverlay", "Overlay added to window manager")
            promise.resolve(true)

        } catch (e: Exception) {
            promise.reject("CREATE_OVERLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun hideOverlay(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            activity.runOnUiThread {
                try {
                    overlayView?.let { view ->
                        windowManager?.removeView(view)
                        overlayView = null
                        windowManager = null
                        layoutParams = null
                    }
                    promise.resolve(true)
                } catch (e: Exception) {
                    // View might not be attached, still consider it success
                    overlayView = null
                    windowManager = null
                    layoutParams = null
                    promise.resolve(true)
                }
            }
        } catch (e: Exception) {
            promise.reject("HIDE_OVERLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateOpacity(opacity: Double, promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            activity.runOnUiThread {
                try {
                    overlayView?.let { view ->
                        view.setBackgroundColor(Color.argb((opacity * 255).toInt(), 0, 0, 0))
                        promise.resolve(true)
                    } ?: run {
                        promise.reject("NO_OVERLAY", "No overlay is currently shown")
                    }
                } catch (e: Exception) {
                    promise.reject("UPDATE_OPACITY_ERROR", e.message, e)
                }
            }
        } catch (e: Exception) {
            promise.reject("UPDATE_OPACITY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            promise.resolve(checkOverlayPermission())
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        try {
            if (checkOverlayPermission()) {
                promise.resolve(true)
                return
            }

            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${activity.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                activity.startActivity(intent)
                promise.resolve(false) // User needs to manually grant permission
            } else {
                promise.resolve(true) // No permission needed for older versions
            }
        } catch (e: Exception) {
            promise.reject("REQUEST_PERMISSION_ERROR", e.message, e)
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val hasPermission = Settings.canDrawOverlays(reactApplicationContext)
            android.util.Log.d("SystemOverlay", "Overlay permission check: $hasPermission")
            hasPermission
        } else {
            android.util.Log.d("SystemOverlay", "Old Android version, permission not required")
            true // No permission check needed for older versions
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        // Clean up overlay when React Native context is destroyed
        overlayView?.let { view ->
            try {
                windowManager?.removeView(view)
            } catch (e: Exception) {
                // Ignore cleanup errors
            }
        }
        overlayView = null
        windowManager = null
        layoutParams = null
    }
}