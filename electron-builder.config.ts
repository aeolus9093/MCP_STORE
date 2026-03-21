// =============================================================
// electron-builder.config.ts — Phase 4 완성 빌드 설정
// =============================================================
//
// 코드 사이닝 환경변수 안내:
//
// [Windows]
//   CSC_LINK           — 코드사이닝 인증서 파일 경로 또는 base64 인코딩 값 (.pfx)
//   CSC_KEY_PASSWORD   — 인증서 비밀번호
//   WIN_CSC_LINK       — Windows 전용 인증서 (CSC_LINK 우선)
//   WIN_CSC_KEY_PASSWORD
//
// [macOS]
//   CSC_LINK           — 코드사이닝 인증서 (.p12)
//   CSC_KEY_PASSWORD   — 인증서 비밀번호
//   APPLE_ID           — Apple Developer 계정 이메일
//   APPLE_APP_SPECIFIC_PASSWORD — App-Specific Password (Apple ID 2FA)
//   APPLE_TEAM_ID      — Apple Developer Team ID
//
// [GitHub Releases 자동 업데이트]
//   GH_TOKEN           — GitHub Personal Access Token (repo scope)
//
// GitHub Secrets에 위 환경변수를 등록하면
// .github/workflows/release.yml이 자동으로 빌드/릴리즈합니다.
// =============================================================

import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId:       "dev.mcpstore.app",
  productName: "MCP Store",

  // ── 아이콘 ─────────────────────────────────────────────────
  // icon.png(512×512) 하나로 electron-builder가 ICO/ICNS 자동 변환
  icon: "build/icon.png",

  // ── 빌드 리소스 & 출력 경로 ────────────────────────────────
  directories: {
    buildResources: "build",   // 아이콘 등 빌드 리소스 위치
    output:         "release", // 패키징 결과물 출력 경로
  },

  // ── 포함/제외 파일 ─────────────────────────────────────────
  files: [
    // 빌드 결과물 (Main + Renderer)
    "dist/**",
    // MCP 레지스트리 데이터
    "packages/**",
    // 제외: 소스 파일, 개발 전용 파일
    "!src/**",
    "!**/*.ts",
    "!**/*.tsx",
    "!**/*.map",
    "!node_modules/.cache/**",
    "!release/**",
    "!.github/**",
  ],

  // 추가 리소스 (실행 시 app.getPath('resources') 하위에 복사)
  extraResources: [
    {
      from: "packages/",
      to:   "packages/",
      filter: ["**/*.json"],
    },
  ],

  // ── 자동 업데이트 (electron-updater + GitHub Releases) ─────
  publish: {
    provider:    "github",
    releaseType: "release",
    owner: "aeolus9093",
    repo:  "MCP_STORE",
  },

  // ── Windows ────────────────────────────────────────────────
  win: {
    // 코드 사이닝: CSC_LINK + CSC_KEY_PASSWORD 환경변수 필요
    // certificateSubjectName: "Your Company Name",
    target: [
      {
        target: "nsis",       // 인스톨러 (.exe)
        arch:   ["x64"],
      },
      {
        target: "portable",   // 포터블 실행파일 (.exe)
        arch:   ["x64"],
      },
    ],
  },

  nsis: {
    oneClick:            false,  // 커스텀 설치 경로 허용
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName:        "MCP Store",
    // 한국어 + 영어 지원
    language:            "1042",
  },

  // ── macOS ──────────────────────────────────────────────────
  mac: {
    category: "public.app-category.developer-tools",
    // 코드 사이닝: CSC_LINK + APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD 필요
    // hardenedRuntime: true,
    // gatekeeperAssess: false,
    // entitlements: "build/entitlements.mac.plist",
    // entitlementsInherit: "build/entitlements.mac.plist",
    target: [
      {
        target: "dmg",   // 디스크 이미지 (.dmg)
        arch:   ["arm64", "x64"],
      },
      {
        target: "pkg",   // macOS 패키지 (.pkg)
        arch:   ["arm64", "x64"],
      },
    ],
  },

  dmg: {
    contents: [
      { x: 130, y: 220, type: "file" },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
    window: { width: 540, height: 380 },
  },

  // ── Linux ──────────────────────────────────────────────────
  linux: {
    category: "Development",
    target: [
      {
        target: "AppImage",  // 범용 포터블 (.AppImage)
        arch:   ["x64"],
      },
      {
        target: "deb",       // Debian/Ubuntu 패키지 (.deb)
        arch:   ["x64"],
      },
    ],
    // desktop entry 메타데이터
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

export default config;
