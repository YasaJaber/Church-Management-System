const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove .ts from source extensions to avoid TypeScript file resolution issues
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'ts');

// Add custom resolver for problematic packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
