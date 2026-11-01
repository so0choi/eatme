// expo/metro-config가 pnpm 모노레포(watchFolders·nodeModulesPaths)를 자동 구성한다.
// 여기서는 NativeWind 설정만 추가한다.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
