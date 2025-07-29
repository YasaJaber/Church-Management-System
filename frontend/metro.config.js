const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Expo.ts resolution issues
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
