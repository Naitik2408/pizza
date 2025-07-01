const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

const config = getDefaultConfig(projectRoot);

// Add the react-native-razorpay module to watchFolders
config.watchFolders = [
  ...nodeModulesPaths,
  path.resolve(projectRoot, 'node_modules/react-native-razorpay')
];

// Make sure the module is in the proper resolution paths
config.resolver.nodeModulesPaths = nodeModulesPaths;

// Remove any custom resolver logic that might cause problems
config.resolver.resolveRequest = undefined;

// Ensure blockList is properly handled - this fixes the "filter is not a function" error
// The default blockList might be a RegExp or an array, so we need to check its type
const defaultBlockList = config.resolver.blockList || [];
let newBlockList = defaultBlockList;

// Only try to filter if it's an array
if (Array.isArray(defaultBlockList)) {
  const moduleBlockListExclusion = /node_modules\/react-native-razorpay\/.*/;
  newBlockList = defaultBlockList.filter(pattern => 
    !(pattern instanceof RegExp && pattern.toString() === moduleBlockListExclusion.toString())
  );
}

// Set the updated blockList
config.resolver.blockList = newBlockList;

module.exports = config;