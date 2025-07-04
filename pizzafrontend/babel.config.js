module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    require.resolve('expo-router/babel'),
  ];
  
  // Remove console.log statements in production
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};