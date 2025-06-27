const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ES6 modulesの解決を改善
config.resolver.sourceExts.push('cjs', 'mjs');
config.resolver.platforms = ['native', 'web', 'default'];

// Node.js polyfills for React Native
config.resolver.alias = {
  '@': path.resolve(__dirname, '.'),
  'assert': require.resolve('assert'),
  'buffer': require.resolve('buffer'),
  'console': require.resolve('console-browserify'),
  'constants': require.resolve('constants-browserify'),
  'crypto': require.resolve('crypto-browserify'),
  'domain': require.resolve('domain-browser'),
  'events': require.resolve('events'),
  'http': require.resolve('stream-http'),
  'https': require.resolve('https-browserify'),
  'os': require.resolve('os-browserify/browser'),
  'path': require.resolve('path-browserify'),
  'punycode': require.resolve('punycode'),
  'process': require.resolve('process/browser'),
  'querystring': require.resolve('querystring-es3'),
  'stream': require.resolve('stream-browserify'),
  'string_decoder': require.resolve('string_decoder'),
  'sys': require.resolve('util'),
  'timers': require.resolve('timers-browserify'),
  'tty': require.resolve('tty-browserify'),
  'url': require.resolve('url'),
  'util': require.resolve('util'),
  'vm': require.resolve('vm-browserify'),
  'zlib': require.resolve('browserify-zlib'),
};

// transformerの設定を追加
config.transformer.unstable_allowRequireContext = true;

// Windows permission issues対策
config.watcher = {
  healthCheck: {
    enabled: true,
  },
  watchman: {
    deferStates: ['hg.update'],
  },
};

module.exports = config;