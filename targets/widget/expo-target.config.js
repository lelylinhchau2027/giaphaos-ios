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
  entitlements: {
    "com.apple.security.application-groups":
      config.ios?.entitlements?.["com.apple.security.application-groups"] || [
        `group.${config.ios?.bundleIdentifier || "com.giaphaos.family"}`,
      ],
  },
});
