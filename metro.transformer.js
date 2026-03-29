/**
 * Custom Metro transformer that patches `import.meta` for web bundles.
 *
 * Metro serves web bundles via <script> (not <script type="module">),
 * so `import.meta` from @expo/metro-runtime causes a SyntaxError in browsers.
 *
 * This transformer replaces occurrences with a safe polyfill object before
 * Babel processes the file.
 */

const upstreamTransformer = require('@expo/metro-config/build/transformer/metro-transform-worker.js');

// Fallback if the above import path changes between Expo versions
const defaultTransformer = (() => {
  try {
    return require('@expo/metro-config/build/transformer/metro-transform-worker.js');
  } catch {
    try {
      return require('metro-react-native-babel-transformer');
    } catch {
      return null;
    }
  }
})();

const transformer = defaultTransformer || upstreamTransformer;

module.exports = {
  ...transformer,
  transform: async (params) => {
    const { platform, filename } = params.options ?? {};

    // Only patch web bundles that contain import.meta
    if (platform === 'web' && params.src && params.src.includes('import.meta')) {
      // Replace import.meta with a safe polyfill to avoid "outside module" error
      params = {
        ...params,
        src: params.src.replace(/import\.meta/g, '({"url":"","hot":null})'),
      };
    }

    return transformer.transform(params);
  },
};
