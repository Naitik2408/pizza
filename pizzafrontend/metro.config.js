const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project root directory
const projectRoot = __dirname;

// Get the default Expo configuration
const config = getDefaultConfig(projectRoot);

// Configure metro to handle native modules properly
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Add support for native modules that might be nested
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-razorpay': path.resolve(projectRoot, 'node_modules/react-native-razorpay'),
};

// Allow importing any file extensions that your project needs
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx',
  'js',
  'ts',
  'tsx',
  'json',
  'cjs',
  'mjs',
];

// Ensure symlinks work properly (particularly useful for monorepo setups)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('react-native-razorpay')) {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react-native-razorpay'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Enable the experimental Hermes engine if you plan to use it
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Export the final config
module.exports = config;