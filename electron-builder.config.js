/** @type {import('electron-builder').Configuration} */
const config = {
  appId: "dev.mcpstore.app",
  productName: "MCP Store",
  icon: "build/icon.png",

  directories: {
    buildResources: "build",
    output: "release",
  },

  // object 형태로 명시적 경로 지정 — **/* glob 이슈 우회
  files: [
    {
      from: "dist",
      to: "dist",
      filter: ["**/*"]
    },
    {
      from: "packages",
      to: "packages",
      filter: ["**/*.json"]
    },
    {
      from: ".",
      to: ".",
      filter: ["package.json"]
    }
  ],

  publish: {
    provider: "github",
    releaseType: "release",
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
