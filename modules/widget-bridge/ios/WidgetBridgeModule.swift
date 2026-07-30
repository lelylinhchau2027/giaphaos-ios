import ExpoModulesCore
import WidgetKit
import Foundation

public class WidgetBridgeModule: Module {
  static var logMessages: [String] = []
  static let maxLogs = 20

  private static func addLog(_ message: String) {
    let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
    logMessages.append("[\(timestamp)] \(message)")
    if logMessages.count > maxLogs { logMessages.removeFirst() }
  }

  /// Đọc App Group từ Info.plist (khớp `appGroup` trong app.config.js) —
  /// KHÔNG suy ra từ bundle identifier, vì App Group không nhất thiết theo
  /// mẫu `group.<bundleId>`.
  private static var appGroupId: String {
    if let fromPlist = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String,
       !fromPlist.isEmpty {
      return fromPlist
    }
    let bundleId = Bundle.main.bundleIdentifier ?? "com.giaphaos.family"
    let baseId = bundleId.replacingOccurrences(of: ".widget", with: "")
    return "group.\(baseId)"
  }

  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("reloadAllTimelines") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    Function("saveWidgetData") { (data: String) in
      let group = WidgetBridgeModule.appGroupId
      WidgetBridgeModule.addLog("Attempting to write events. Using group: \(group)")

      guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
        WidgetBridgeModule.addLog("Failed to get container URL. Ensure Entitlements.")
        return
      }
      WidgetBridgeModule.addLog("Container URL: \(containerURL.path)")
      let fileURL = containerURL.appendingPathComponent("events.json")

      do {
        try data.write(to: fileURL, atomically: true, encoding: .utf8)
        if let readBack = try? String(contentsOf: fileURL, encoding: .utf8) {
          WidgetBridgeModule.addLog("Successfully wrote events. Verified length: \(readBack.count)")
        } else {
          WidgetBridgeModule.addLog("Wrote events but verification read-back failed.")
        }
      } catch {
        WidgetBridgeModule.addLog("Failed to write events: \(error.localizedDescription)")
      }
    }

    Function("saveWidgetInfo") { (info: [String: Any]) in
      let group = WidgetBridgeModule.appGroupId
      guard let defaults = UserDefaults(suiteName: group) else {
        WidgetBridgeModule.addLog("saveWidgetInfo: FAILED to open UserDefaults suite \(group)")
        return
      }
      for (key, value) in info {
        defaults.set(value, forKey: key)
      }
      let readBack = defaults.object(forKey: "memberCount")
      WidgetBridgeModule.addLog("saveWidgetInfo: wrote \(info.count) keys to \(group). Readback memberCount=\(String(describing: readBack))")
    }

    Function("getWidgetLogs") { () -> String in
      WidgetBridgeModule.logMessages.joined(separator: "\n")
    }
  }
}
