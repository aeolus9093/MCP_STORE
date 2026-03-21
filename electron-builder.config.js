/**
 * electron-builder 설정 (CommonJS)
 * TypeScript config 파싱 이슈 방지를 위해 .js로 변환
 */

/** @type {import('electron-builder').Configuration} */
const config = {
  appId:       "dev.mcpstore.app",
  productName: "MCP Store",
  icon:        "build/icon.png",

  directories: {
    buildResources: "build",
    output:         "release",
  },

  // files를 지정하지 않으면 electron-builder 기본값 사용
  // 기본값: **/* + 표준 제외 목록 (node_modules/.cache 등)
  // dist/main/main/index.js 는 기본값으로 반드시 포함됨

  extraResources: [
    {
      from:   "packages/",
      to:     "packages/",
      filter: ["**/*.json"],
    },
  ],

  publish: {
    provider:    "github",
    releaseType: "release",
    owner:       "aeolus9093",
    repo:        "MCP_STORE",
  },

  win: {
    target: [
      { target: "nsis",     arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut:   true,
    createStartMenuShortcut: true,
    shortcutName:            "MCP Store",
    language:                "1042",
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
      { target: "deb",      arch: ["x64"] },
    ],
    desktop: {
      Name:       "MCP Store",
      Comment:    "One-click MCP installer for AI clients",
      Categories: "Development;Utility;",
    },
  },

  deb: {
    depends: ["libgtk-3-0", "libnotify4", "libnss3", "libxss1", "libxtst6", "xdg-utils"],
  },
};

module.exports = config;
