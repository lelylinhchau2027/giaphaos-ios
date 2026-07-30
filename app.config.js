const { withEntitlementsPlist } = require("expo/config-plugins");

const bundleId = process.env.IOS_BUNDLE_ID || "com.giaphaos.family";
/**
 * Cố định, KHÔNG suy ra từ bundleId. App Group là một namespace toàn cục
 * của Apple (không riêng theo từng Apple ID) — nếu chuỗi này từng được
 * đăng ký (bởi chính máy này ở lần ký ESign trước, tài khoản Apple khác,
 * hay bất kỳ ai) dưới một Apple ID KHÁC với Apple ID đang dùng để ký, thì
 * Apple sẽ từ chối cấp lại App Group đó — app vẫn cài/chạy bình thường
 * nhưng `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)`
 * luôn trả về nil, khiến app/widget không chia sẻ được dữ liệu (widget kẹt
 * ở trạng thái rỗng dù app đã đồng bộ thành công). Hậu tố ngẫu nhiên bên
 * dưới giảm khả năng trùng với App Group ai đó đã đăng ký trước đó.
 */
const appGroup =
  process.env.EXPO_PUBLIC_APP_GROUP || "group.com.giaphaos.family.gp2wq9xk";

/**
 * App chỉ dùng local notifications (không có remote push token nào được
 * đăng ký) nhưng plugin "expo-notifications" luôn tự thêm entitlement
 * `aps-environment`. Entitlement này (dev lẫn production) đòi hỏi tài khoản
 * Apple Developer trả phí — chứng chỉ cá nhân dùng để ký lại qua ESign
 * không cấp được, và việc xin nó thất bại có thể khiến App Group cũng
 * không được cấp theo. Xoá nó đi sau khi plugin expo-notifications chạy.
 */
function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Gia Phả OS",
  slug: "giaphaos",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "giaphaos",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#fafaf9",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    buildNumber: "2",
    // Điền Team ID từ https://developer.apple.com/account → Membership
    appleTeamId: process.env.IOS_APPLE_TEAM_ID || undefined,
    infoPlist: {
      CFBundleDisplayName: "Gia Phả",
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
      },
      // Đọc bằng Swift lúc runtime (WidgetBridgeModule) thay vì suy ra từ
      // bundle identifier — tránh lệch khi appGroup khác `group.<bundleId>`.
      AppGroupIdentifier: appGroup,
    },
    entitlements: {
      "com.apple.security.application-groups": [appGroup],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: "#fafaf9",
      foregroundImage: "./assets/adaptive-icon.png",
    },
  },
  plugins: [
    "expo-router",
    "expo-splash-screen",
    // Đăng ký TRƯỚC "expo-notifications": Expo áp dụng các mod ios.entitlements
    // theo thứ tự ngược (plugin đăng ký sau chạy trước), nên plugin xoá
    // aps-environment phải đứng trước plugin thêm nó thì mới chạy SAU và có
    // tác dụng thật sự.
    withoutPushEntitlement,
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#d97706",
        sounds: [],
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4",
        },
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Cho phép chọn ảnh đại diện thành viên trong gia phả.",
      },
    ],
    "@bacons/apple-targets",
  ],
  extra: {
    webUrl: process.env.EXPO_PUBLIC_WEB_URL || "https://giapha-os.homielab.com",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    siteName: process.env.EXPO_PUBLIC_SITE_NAME || "Gia Phả OS",
    appGroup,
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "",
    },
  },
  owner: process.env.EAS_OWNER || undefined,
};
