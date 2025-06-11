const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

const withSystemBars = (config) => {
  // Androidマニフェストの設定
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainActivity = androidManifest.manifest.application[0].activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );
    
    if (mainActivity) {
      // フルスクリーン対応のテーマを設定
      mainActivity.$['android:theme'] = '@style/Theme.App.SplashScreen';
      
      // ウィンドウフラグを設定
      if (!mainActivity.$['android:windowSoftInputMode']) {
        mainActivity.$['android:windowSoftInputMode'] = 'adjustResize';
      }
    }
    
    return config;
  });

  // MainActivityにシステムバー制御を追加
  config = withMainActivity(config, (config) => {
    const { contents } = config.modResults;
    
    // インポートを追加
    if (!contents.includes('import com.reactnativesystembars.AndroidSystemBarsModule')) {
      config.modResults.contents = contents.replace(
        /(import\s+.*react\.ReactActivity[^;]*;)/,
        '$1\nimport com.reactnativesystembars.AndroidSystemBarsModule;'
      );
    }
    
    return config;
  });

  return config;
};

module.exports = withSystemBars;