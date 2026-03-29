module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Fix: Metro bundles web as <script> (not type="module"),
      // so `import.meta` from @expo/metro-runtime causes SyntaxError.
      // This inline plugin replaces import.meta with a safe polyfill.
      function importMetaPolyfill() {
        return {
          visitor: {
            MetaProperty(path) {
              if (
                path.node.meta.name === 'import' &&
                path.node.property.name === 'meta'
              ) {
                path.replaceWithSourceString('({"url":"","hot":null})');
              }
            },
          },
        };
      },
    ],
  };
};
