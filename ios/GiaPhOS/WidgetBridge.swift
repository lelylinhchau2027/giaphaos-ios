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
}
