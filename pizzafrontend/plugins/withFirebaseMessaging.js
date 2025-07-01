const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseMessaging(config) {
  // Add Firebase Messaging to build.gradle
  config = withAppBuildGradle(config, async (config) => {
    if (!config.modResults.contents.includes('com.google.firebase:firebase-messaging')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.3.1'`
      );
    }
    return config;
  });

  // Add required configurations to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add FCM service
    const application = androidManifest.application[0];
    
    // Check if the service is already defined
    const hasMessagingService = application.service?.some(
      service => service.$['android:name'] === '.expo.modules.notifications.FirebaseMessagingService'
    );
    
    if (!hasMessagingService) {
      if (!application.service) {
        application.service = [];
      }
      
      application.service.push({
        $: {
          'android:name': '.expo.modules.notifications.FirebaseMessagingService',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            $: {},
            action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
          },
        ],
      });
    }

    return config;
  });

  return config;
};