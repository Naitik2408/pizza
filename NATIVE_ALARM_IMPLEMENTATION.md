// 1. Add to android/app/src/main/AndroidManifest.xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
<uses-permission android:name="android.permission.TURN_SCREEN_ON" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

// 2. Create native Android alarm module
// android/app/src/main/java/com/yourapp/AlarmModule.java
package com.yourapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AlarmModule extends ReactContextBaseJavaModule {
    
    @ReactMethod
    public void triggerCriticalAlarm(String orderData) {
        // This will work even when app is closed
        AlarmManager alarmManager = (AlarmManager) getReactApplicationContext()
            .getSystemService(Context.ALARM_SERVICE);
        
        Intent intent = new Intent(getReactApplicationContext(), AlarmReceiver.class);
        intent.putExtra("orderData", orderData);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getReactApplicationContext(), 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Schedule immediate alarm that bypasses all restrictions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, 
                System.currentTimeMillis(), 
                pendingIntent
            );
        }
    }
}

// 3. Create alarm receiver
// android/app/src/main/java/com/yourapp/AlarmReceiver.java
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // This triggers even when app is completely closed
        String orderData = intent.getStringExtra("orderData");
        
        // Show full-screen alert
        Intent fullScreenIntent = new Intent(context, AlarmActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                                 Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(fullScreenIntent);
        
        // Trigger vibration and sound
        triggerAlarmSound(context);
    }
}
