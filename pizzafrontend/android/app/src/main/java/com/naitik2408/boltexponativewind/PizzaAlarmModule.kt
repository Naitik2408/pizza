package com.naitik2408.boltexponativewind

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import java.util.*

class PizzaAlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PizzaAlarmModule"
    }

    @ReactMethod
    fun setOrderAlarm(orderData: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val orderId = orderData.getString("orderId") ?: UUID.randomUUID().toString()
            val orderNumber = orderData.getString("orderNumber") ?: "Unknown"
            val customerName = orderData.getString("customerName") ?: "Customer"
            val amount = orderData.getDouble("amount")
            val delaySeconds = if (orderData.hasKey("delaySeconds")) orderData.getInt("delaySeconds") else 0
            
            Log.d("PizzaAlarm", "Setting alarm for order: $orderNumber, delay: ${delaySeconds}s")
            
            val intent = Intent(context, PizzaAlarmReceiver::class.java).apply {
                action = "com.pizzaapp.ORDER_ALARM"
                putExtra("orderId", orderId)
                putExtra("orderNumber", orderNumber)
                putExtra("customerName", customerName)
                putExtra("amount", amount)
                putExtra("timestamp", System.currentTimeMillis())
            }
            
            val requestCode = orderId.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val triggerTime = System.currentTimeMillis() + (delaySeconds * 1000L)
            
            // Use setExactAndAllowWhileIdle for maximum reliability
            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    )
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT -> {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    )
                }
                else -> {
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    )
                }
            }
            
            Log.d("PizzaAlarm", "✅ Alarm set successfully for order: $orderNumber")
            promise.resolve("Alarm set successfully")
            
        } catch (e: Exception) {
            Log.e("PizzaAlarm", "❌ Failed to set alarm: ${e.message}")
            promise.reject("ALARM_ERROR", "Failed to set alarm: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelOrderAlarm(orderId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, PizzaAlarmReceiver::class.java)
            val requestCode = orderId.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            alarmManager.cancel(pendingIntent)
            Log.d("PizzaAlarm", "✅ Alarm cancelled for order: $orderId")
            promise.resolve("Alarm cancelled successfully")
            
        } catch (e: Exception) {
            Log.e("PizzaAlarm", "❌ Failed to cancel alarm: ${e.message}")
            promise.reject("ALARM_ERROR", "Failed to cancel alarm: ${e.message}")
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            val context = reactApplicationContext
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = android.net.Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                promise.resolve("Battery optimization exemption requested")
            } else {
                promise.resolve("Battery optimization not needed on this Android version")
            }
            
        } catch (e: Exception) {
            Log.e("PizzaAlarm", "❌ Failed to request battery optimization exemption: ${e.message}")
            promise.reject("BATTERY_ERROR", "Failed to request exemption: ${e.message}")
        }
    }

    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val canScheduleExactAlarms = alarmManager.canScheduleExactAlarms()
                promise.resolve(canScheduleExactAlarms)
            } else {
                promise.resolve(true) // Permission not needed on older versions
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to check permission: ${e.message}")
        }
    }
}
