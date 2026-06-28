const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // @hmscore/react-native-hms-push is a Huawei-only optional dependency.
      // If it isn't installed, stub it so Metro can still build the bundle.
      if (moduleName === '@hmscore/react-native-hms-push') {
        try {
          require.resolve(moduleName);
        } catch {
          return {
            type: 'sourceFile',
            filePath: path.resolve(__dirname, 'src/lib/push/hms-stub.js'),
          };
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
