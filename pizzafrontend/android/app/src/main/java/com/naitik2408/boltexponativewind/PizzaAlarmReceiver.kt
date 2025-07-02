package com.naitik2408.boltexponativewind

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class PizzaAlarmReceiver : BroadcastReceiver() {
    
    companion object {
        private const val CHANNEL_ID = "PIZZA_CRITICAL_ORDERS"
        private const val NOTIFICATION_ID = 12345
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d("PizzaAlarmReceiver", "🚨 PIZZA ALARM TRIGGERED!")
        
        when (intent.action) {
            "com.pizzaapp.ORDER_ALARM" -> {
                handleOrderAlarm(context, intent)
            }
            "android.intent.action.BOOT_COMPLETED" -> {
                Log.d("PizzaAlarmReceiver", "📱 Device rebooted - Pizza alarms restored")
                // Could restore persistent alarms here if needed
            }
        }
    }

    private fun handleOrderAlarm(context: Context, intent: Intent) {
        val orderId = intent.getStringExtra("orderId") ?: "unknown"
        val orderNumber = intent.getStringExtra("orderNumber") ?: "Unknown"
        val customerName = intent.getStringExtra("customerName") ?: "Customer"
        val amount = intent.getDoubleExtra("amount", 0.0)
        
        Log.d("PizzaAlarmReceiver", "🍕 Processing alarm for order: $orderNumber")
        
        // Wake up the device
        wakeUpDevice(context)
        
        // Play alarm sound
        playAlarmSound(context)
        
        // Vibrate device
        vibrateDevice(context)
        
        // Show critical notification
        showCriticalNotification(context, orderNumber, customerName, amount)
        
        // Log success
        Log.d("PizzaAlarmReceiver", "✅ Pizza alarm completed for order: $orderNumber")
    }

    private fun wakeUpDevice(context: Context) {
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            
            @Suppress("DEPRECATION")
            val wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "PizzaApp:OrderAlarm"
            )
            
            wakeLock.acquire(10000) // Hold for 10 seconds
            
            Log.d("PizzaAlarmReceiver", "📱 Device wake up triggered")
            
            // Release wake lock after delay
            android.os.Handler().postDelayed({
                if (wakeLock.isHeld) {
                    wakeLock.release()
                }
            }, 10000)
            
        } catch (e: Exception) {
            Log.e("PizzaAlarmReceiver", "❌ Failed to wake device: ${e.message}")
        }
    }

    private fun playAlarmSound(context: Context) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // Set volume to maximum for alarm
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
            
            // Use default alarm sound
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            
            val mediaPlayer = MediaPlayer().apply {
                setDataSource(context, alarmUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = false
                prepare()
                start()
            }
            
            // Stop sound after 5 seconds
            android.os.Handler().postDelayed({
                try {
                    if (mediaPlayer.isPlaying) {
                        mediaPlayer.stop()
                        mediaPlayer.release()
                    }
                } catch (e: Exception) {
                    Log.e("PizzaAlarmReceiver", "Error stopping alarm sound: ${e.message}")
                }
            }, 5000)
            
            Log.d("PizzaAlarmReceiver", "🔊 Alarm sound playing")
            
        } catch (e: Exception) {
            Log.e("PizzaAlarmReceiver", "❌ Failed to play alarm sound: ${e.message}")
        }
    }

    private fun vibrateDevice(context: Context) {
        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Create strong vibration pattern for urgent orders
                val pattern = longArrayOf(0, 1000, 200, 1000, 200, 1000, 200, 1000)
                val vibrationEffect = VibrationEffect.createWaveform(pattern, -1)
                vibrator.vibrate(vibrationEffect)
            } else {
                @Suppress("DEPRECATION")
                val pattern = longArrayOf(0, 1000, 200, 1000, 200, 1000, 200, 1000)
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, -1)
            }
            
            Log.d("PizzaAlarmReceiver", "📳 Device vibration triggered")
            
        } catch (e: Exception) {
            Log.e("PizzaAlarmReceiver", "❌ Failed to vibrate device: ${e.message}")
        }
    }

    private fun showCriticalNotification(context: Context, orderNumber: String, customerName: String, amount: Double) {
        try {
            createNotificationChannel(context)
            
            // Create intent to open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("openOrderId", orderNumber)
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("🚨 URGENT: NEW PIZZA ORDER!")
                .setContentText("👤 $customerName\n📦 Order $orderNumber\n💰 ₹$amount\n\n🔔 TAP TO VIEW ORDER")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("👤 Customer: $customerName\n📦 Order: $orderNumber\n💰 Amount: ₹$amount\n\n🚨 IMMEDIATE ATTENTION REQUIRED!\n🔔 Tap to view order details"))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(false)
                .setOngoing(true)
                .setFullScreenIntent(pendingIntent, true)
                .setContentIntent(pendingIntent)
                .setColor(Color.RED)
                .setColorized(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build()
            
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(NOTIFICATION_ID, notification)
            
            Log.d("PizzaAlarmReceiver", "🔔 Critical notification shown")
            
        } catch (e: Exception) {
            Log.e("PizzaAlarmReceiver", "❌ Failed to show notification: ${e.message}")
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "🚨 Critical Pizza Orders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent pizza order notifications that bypass Do Not Disturb"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 200, 1000, 200, 1000)
                setBypassDnd(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
