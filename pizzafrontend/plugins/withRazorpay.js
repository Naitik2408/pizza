const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

// Add Razorpay dependency to build.gradle
const withRazorpayGradle = (config) => {
  return withAppBuildGradle(config, async (config) => {
    if (!config.modResults.contents.includes('com.razorpay:checkout')) {
      config.modResults.contents = mergeContents({
        src: config.modResults.contents,
        newSrc: `    implementation 'com.razorpay:checkout:1.6.26'`,
        anchor: /dependencies\s?{/,
        offset: 1,
        tag: 'razorpay-gradle',
        comment: '//'
      }).contents;
    }
    return config;
  });
};

// Add Razorpay activity to AndroidManifest.xml
const withRazorpayManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Check if Razorpay activity already exists
    const existingActivity = mainApplication.activity?.find(
      activity => activity.$?.['android:name'] === 'com.razorpay.CheckoutActivity'
    );
    
    if (!existingActivity) {
      if (!mainApplication.activity) {
        mainApplication.activity = [];
      }
      
      mainApplication.activity.push({
        $: {
          'android:name': 'com.razorpay.CheckoutActivity',
          'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize',
          'android:theme': '@style/AppTheme',
          'android:exported': 'true'
        }
      });
    }
    
    return config;
  });
};

module.exports = (config) => {
  config = withRazorpayGradle(config);
  config = withRazorpayManifest(config);
  return config;
};