#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)
RCT_EXTERN_METHOD(reloadAllTimelines)
RCT_EXTERN_METHOD(saveWidgetData:(NSString *)data)
RCT_EXTERN_METHOD(getWidgetLogs:(RCTResponseSenderBlock)callback)
@end
