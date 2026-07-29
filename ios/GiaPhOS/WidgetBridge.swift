import WidgetKit
import Foundation

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  // Shared storage for logs
  static var logMessages: [String] = []
  static let maxLogs = 20

  private static func addLog(_ message: String) {
    let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
    logMessages.append("[\(timestamp)] \(message)")
    if logMessages.count > maxLogs { logMessages.removeFirst() }
  }

  @objc
  func reloadAllTimelines() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
    
  private var appGroupId: String {
    let bundleId = Bundle.main.bundleIdentifier ?? "com.giaphaos.family"
    let baseId = bundleId.replacingOccurrences(of: ".widget", with: "")
    return "group.\(baseId)"
  }

  @objc
  func saveWidgetData(_ data: String) {
    let group = self.appGroupId
    WidgetBridge.addLog("Attempting to write events. Using group: \(group)")
    
    if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) {
      WidgetBridge.addLog("Container URL: \(containerURL.path)")
      let fileURL = containerURL.appendingPathComponent("events.json")
      
      do {
        try data.write(to: fileURL, atomically: true, encoding: .utf8)
        WidgetBridge.addLog("Successfully wrote events.")
        
        if let readBack = try? String(contentsOf: fileURL, encoding: .utf8) {
            WidgetBridge.addLog("Verification successful. Content length: \(readBack.count)")
        } else {
            WidgetBridge.addLog("Verification failed.")
        }
      } catch {
        WidgetBridge.addLog("Failed to write events: \(error.localizedDescription)")
      }
    } else {
        WidgetBridge.addLog("Failed to get container URL. Ensure Entitlements.")
    }
  }

  @objc
  func getWidgetLogs(_ callback: RCTResponseSenderBlock) {
    callback([WidgetBridge.logMessages.joined(separator: "\n")])
  }
}
