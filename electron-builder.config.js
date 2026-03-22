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

  // app-update.yml 생성을 위해 publish 설정 필요 (electron-updater가 사용)
  // 실제 업로드는 --publish never 플래그로 차단, 릴리스는 softprops/action-gh-release@v2 처리
  publish: {
    provider: "github",
    owner: "aeolus9093",
    repo: "MCP_STORE",
  },

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
