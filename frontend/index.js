import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

console.log('Index.js loaded successfully');

// Import simple test app first
import SimpleApp from './SimpleApp';
// import App from './App';

console.log('SimpleApp component imported successfully');

// تجاهل التحذيرات المعروفة التي قد تسبب مشاكل
LogBox.ignoreLogs([
  'Warning: componentWillReceiveProps',
  'Warning: componentWillMount',
  'Module RCTImageLoader',
  'Setting a timer for a long period of time',
  'VirtualizedLists should never be nested',
  'Can\'t perform a React state update',
  'Remote debugger',
  'Require cycle:'
]);

// معالج الأخطاء العام
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('🚨 خطأ عام في التطبيق:', error);
  
  if (isFatal) {
    console.error('💀 خطأ قاتل:', error.name, error.message);
  } else {
    console.warn('⚠️ خطأ غير قاتل:', error.name, error.message);
  }
  
  // استدعاء المعالج الأصلي
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately

console.log('Registering root component...');

registerRootComponent(SimpleApp);

console.log('Root component registered successfully');
