import { requireOptionalNativeModule } from 'expo-modules-core';

type WidgetBridgeModule = {
  reloadAllTimelines: () => void;
  saveWidgetData: (data: string) => void;
  saveWidgetInfo: (info: Record<string, string | number>) => void;
  getWidgetLogs: () => string;
};

const WidgetBridge = requireOptionalNativeModule<WidgetBridgeModule>('WidgetBridge');

export function reloadWidgets() {
  WidgetBridge?.reloadAllTimelines();
}

export function saveWidgetData(data: string) {
  WidgetBridge?.saveWidgetData(data);
}

export function saveWidgetInfo(info: Record<string, string | number>) {
  WidgetBridge?.saveWidgetInfo(info);
}

export function getWidgetLogs(callback: (logs: string) => void) {
  if (!WidgetBridge) {
    callback("WidgetBridge not available");
    return;
  }
  callback(WidgetBridge.getWidgetLogs());
}
