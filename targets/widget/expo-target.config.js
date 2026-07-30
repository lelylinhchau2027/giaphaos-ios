/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "GiaPhaWidget",
  displayName: "Gia Phả",
  deploymentTarget: "16.4",
  bundleIdentifier: ".widget",
  icon: "../../assets/icon.png",
  colors: {
    $accent: "#D97706",
    $widgetBackground: "#FAFAF9",
  },
  // Không cần App Group / entitlements: widget tự gọi Supabase REST trực
  // tiếp (xem widgets.swift) — ESign (Apple ID cá nhân) không cấp được
  // App Group nên không thể chia sẻ dữ liệu qua App Group container nữa.
});
