const bundleId = process.env.IOS_BUNDLE_ID || "com.giaphaos.family";
const appGroup = process.env.EXPO_PUBLIC_APP_GROUP || `group.${bundleId}`;

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
    buildNumber: "1",
    // Điền Team ID từ https://developer.apple.com/account → Membership
    appleTeamId: process.env.IOS_APPLE_TEAM_ID || undefined,
    infoPlist: {
      CFBundleDisplayName: "Gia Phả",
      UIBackgroundModes: ["remote-notification"],
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
      },
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
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#d97706",
        sounds: [],
        mode: "production",
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
