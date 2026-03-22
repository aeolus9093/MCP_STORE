/** @type {import('electron-builder').Configuration} */
const config = {
  appId: "dev.mcpstore.app",
  productName: "MCP Store",
  icon: "build/icon.png",

  directories: {
    buildResources: "build",
    output: "release",
  },

  files: [
    "dist/**/*",
    "packages/**/*.json",
    "package.json"
  ],

  // publish는 softprops/action-gh-release@v2 워크플로우가 처리
  // electron-builder가 GH_TOKEN 없이 자동 publish 시도하는 것을 방지
  publish: null,

  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "MCP Store",
    language: "1042",
  },

  mac: {
    category: "public.app-category.developer-tools",
    target: [
      { target: "dmg", arch: ["arm64", "x64"] },
    ],
  },

  dmg: {
    contents: [
      { x: 130, y: 220, type: "file" },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
    window: { width: 540, height: 380 },
  },

  linux: {
    category: "Development",
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
    ],
    desktop: {
      Name: "MCP Store",
      Comment: "One-click MCP installer for AI clients",
      Categories: "Development;Utility;",
    },
  },

  deb: {
    depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils"],
  },
};

module.exports = config;
