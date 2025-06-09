const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ES6 modulesの解決を改善
config.resolver.sourceExts.push('cjs', 'mjs');
config.resolver.platforms = ['native', 'web', 'default'];

// transformerの設定を追加
config.transformer.unstable_allowRequireContext = true;

module.exports = config;