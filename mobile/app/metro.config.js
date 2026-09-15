// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: three@0.160 exports warning "invalid package.json configuration"
// Expo's Metro with packageExports enabled tries to resolve "three/examples/jsm/loaders/*"
// without .js extension via `exports` map. The wildcard "./examples/jsm/*": "./examples/jsm/*"
// should handle it but Metro's strict resolver still warns and falls back to file-based.
// Disabling packageExports for now silences the noisy WARNs with no runtime impact
// (three still resolves via file-based resolution, which is how expo-three uses it).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
