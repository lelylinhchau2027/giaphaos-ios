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
    
  private var appGroupId: String {
    let bundleId = Bundle.main.bundleIdentifier ?? "com.giaphaos.family"
    // If the bundle ID has a .widget suffix, remove it to find the base ID
    let baseId = bundleId.replacingOccurrences(of: ".widget", with: "")
    return "group.\(baseId)"
  }

  @objc
  func saveWidgetData(_ data: String) {
    let group = self.appGroupId
    if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) {
      let fileURL = containerURL.appendingPathComponent("events.json")
      do {
        try data.write(to: fileURL, atomically: true, encoding: .utf8)
        print("WIDGET DEBUG: Successfully wrote events to \(fileURL.path) in group \(group)")
      } catch {
        print("WIDGET DEBUG: Failed to write events to group \(group): \(error)")
      }
    } else {
        print("WIDGET DEBUG: Failed to get container URL for group: \(group)")
    }
  }
}
