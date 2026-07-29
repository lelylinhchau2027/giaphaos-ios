import { NativeModules } from 'react-native';

const { WidgetBridge } = NativeModules;

export function reloadWidgets() {
  if (WidgetBridge && typeof WidgetBridge.reloadAllTimelines === 'function') {
    WidgetBridge.reloadAllTimelines();
  }
}

export function saveWidgetData(data: string) {
  if (WidgetBridge && typeof WidgetBridge.saveWidgetData === 'function') {
    WidgetBridge.saveWidgetData(data);
  }
}
