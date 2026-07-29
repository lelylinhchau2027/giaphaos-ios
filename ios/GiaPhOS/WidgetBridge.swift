import WidgetKit
import Foundation

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  @objc
  func reloadAllTimelines() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
    
  @objc
  func saveWidgetData(_ data: String) {
    let appGroupId = "group.com.giaphaos.family"
    if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
      let fileURL = containerURL.appendingPathComponent("events.json")
      do {
        try data.write(to: fileURL, atomically: true, encoding: .utf8)
        print("WIDGET DEBUG: Successfully wrote events to \(fileURL.path)")
      } catch {
        print("WIDGET DEBUG: Failed to write events: \(error)")
      }
    } else {
        print("WIDGET DEBUG: Failed to get container URL for group: \(appGroupId)")
    }
  }
}
