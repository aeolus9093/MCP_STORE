# ⚡ MCP Store

> **One-click MCP installer for AI clients**
> MCP(Model Context Protocol) 서버를 클릭 한 번으로 설치하는 Electron 데스크탑 앱

---

## 스크린샷

<!-- 스크린샷 placeholder — 실제 스크린샷으로 교체하세요 -->

| 스토어 홈 | 상세 페이지 | 설치된 MCP |
|:---------:|:-----------:|:----------:|
| ![Home](docs/screenshots/home.png) | ![Detail](docs/screenshots/detail.png) | ![Installed](docs/screenshots/installed.png) |

---

## 기능

- **100+ MCP** 큐레이션 — GitHub, Slack, Notion, PostgreSQL, Playwright 등
- **원클릭 설치** — npm / npx / uvx / Docker 자동 실행
- **다중 클라이언트 동시 설치** — Claude Desktop, Cursor, Windsurf, Claude Code, VS Code, Zed
- **환경 변수 안전 입력** — API Key 마스킹
- **품질 자동 채점** — stars / 최근성 / 설명 / 클라이언트 지원 수 기반 0–100점
- **README 렌더링** — 각 MCP의 GitHub README 인라인 표시
- **사용자 별점 / 리뷰** — 로컬 JSON 저장
- **검색 히스토리** — 최근 10개 자동 저장
- **백업 / 복원** — 설치 목록 JSON 내보내기/가져오기
- **자동 업데이트** — GitHub Releases 기반, 재시작 없이 다운로드

---

## 설치 방법

### Windows

1. [Releases 페이지](https://github.com/your-username/mcp-store/releases)에서 최신 버전의 `.exe` 다운로드
2. `MCP-Store-Setup-x.x.x.exe` 실행 후 설치 안내 따르기
3. 또는 `MCP-Store-x.x.x-portable.exe` — 설치 없이 바로 실행

### macOS

1. [Releases 페이지](https://github.com/your-username/mcp-store/releases)에서 `.dmg` 다운로드
2. DMG 마운트 후 `MCP Store.app`을 `/Applications`으로 드래그

### Linux

1. [Releases 페이지](https://github.com/your-username/mcp-store/releases)에서 `.AppImage` 또는 `.deb` 다운로드
2. AppImage: `chmod +x MCP-Store-*.AppImage && ./MCP-Store-*.AppImage`
3. deb: `sudo dpkg -i mcp-store_*.deb`

---

## 지원 클라이언트

| 클라이언트 | 설정 파일 자동 감지 | 플랫폼 |
|-----------|:-----------------:|--------|
| Claude Desktop | ✅ | Windows / macOS / Linux |
| Cursor | ✅ | Windows / macOS / Linux |
| Windsurf | ✅ | Windows / macOS / Linux |
| Claude Code | ✅ | Windows / macOS / Linux |
| VS Code (Cline) | ✅ | Windows / macOS / Linux |
| Zed | ✅ | macOS / Linux |

---

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Vite + Electron 동시)
npm run dev

# 타입 검사
npm run typecheck
```

### 빌드

```bash
# Windows 인스톨러 + 포터블 빌드
npm run build:win

# macOS DMG + pkg 빌드
npm run build:mac

# Linux AppImage + deb 빌드
npm run build:linux

# 전체 플랫폼 빌드
npm run build:all
```

### 의존성 요구사항

- **Node.js** 18+
- **npm** 9+
- uvx 사용 MCP: Python + [uv](https://docs.astral.sh/uv/) 필요
- Docker 사용 MCP: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 필요

---

## 프로젝트 구조

```
mcp-store/
├── src/
│   ├── main/               # Electron 메인 프로세스
│   │   ├── index.ts        # 앱 진입점
│   │   ├── preload.ts      # contextBridge API
│   │   ├── ipc-handlers.ts # IPC 핸들러
│   │   ├── installer.ts    # npm/npx/uvx/docker 설치
│   │   ├── config-manager.ts # OS별 설정 파일 자동 감지
│   │   ├── registry.ts     # MCP 레지스트리 검색
│   │   ├── auto-updater.ts # 자동 업데이트
│   │   └── ...
│   ├── renderer/           # React 렌더러
│   │   ├── pages/          # Home / Detail / Installed / Settings
│   │   ├── components/     # 공통 컴포넌트
│   │   └── store/          # Zustand 전역 상태
│   └── shared/
│       └── types.ts        # 공유 타입 + IPC 상수
├── packages/
│   └── registry.json       # 100+ MCP 큐레이션 데이터
├── build/                  # 앱 아이콘 (icon.png/ico/icns)
├── .github/workflows/
│   └── release.yml         # GitHub Actions 자동 빌드/릴리즈
└── electron-builder.config.ts
```

---

## 기여 방법

새 MCP를 추가하거나 버그를 수정하고 싶다면 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

1. 이 저장소를 Fork
2. 브랜치 생성: `git checkout -b feat/add-new-mcp`
3. 변경 후 커밋: `git commit -m "feat: add my-mcp"`
4. PR 제출

### MCP 제출

새 MCP를 스토어에 추가하려면 [GitHub Issue 템플릿](https://github.com/your-username/mcp-store/issues/new?template=submit-mcp.md)을 사용하거나, `packages/registry.json`에 직접 추가 후 PR을 보내세요.

---

## 라이선스

[MIT](LICENSE) © 2026 MCP Store Contributors
