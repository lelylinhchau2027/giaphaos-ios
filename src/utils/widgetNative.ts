import { NativeModules } from 'react-native';

const { WidgetBridge } = NativeModules;

export function reloadWidgets() {
  if (WidgetBridge && typeof WidgetBridge.reloadAllTimelines === 'function') {
    WidgetBridge.reloadAllTimelines();
  }
}
