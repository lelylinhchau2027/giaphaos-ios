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

export function saveWidgetInfo(info: Record<string, string | number>) {
  if (WidgetBridge && typeof WidgetBridge.saveWidgetInfo === 'function') {
    WidgetBridge.saveWidgetInfo(info);
  }
}

export function getWidgetLogs(callback: (logs: string) => void) {
  if (WidgetBridge && typeof WidgetBridge.getWidgetLogs === 'function') {
    WidgetBridge.getWidgetLogs(callback);
  } else {
    callback("WidgetBridge not available");
  }
}
