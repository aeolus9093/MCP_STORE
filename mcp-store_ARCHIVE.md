# mcp-store_ARCHIVE.md

> 프로젝트: MCP Store — Electron 기반 MCP 설치 관리자
> 언어: TypeScript / React / Node.js

---

## 변경 이력

| 날짜          | 버전  | 내용 |
| ------------- | ----- | ---- |
| 2026-03-20    | v0.1.0 | Phase 0 + Phase 1 MVP 초기 구현. 전체 파일 구조 생성. |
| 2026-03-20    | v0.1.1 | 버그픽스: tsconfig.main.json rootDir 수정(src), package.json main 경로 수정(dist/main/main/index.js), registry.ts getRegistryPath 경로 수정, ipc-handlers.ts 타입 오류 수정, 다크테마 전체 적용 |
| 2026-03-20    | v0.1.2 | 치명적 버그픽스: execa@8, lowdb@7 ESM-only 패키지 → Node.js 내장 child_process/fs로 교체. initDB 동기화. NODE_ENV=development dev 스크립트 추가. moduleResolution 명시. |
| 2026-03-20    | v0.1.3 | 버그픽스: index.ts NODE_ENV 체크 → app.isPackaged로 교체 (dev 모드 신뢰성). stale dist 파일 정리. global.d.ts mcpStore optional 선언. Home.tsx 안전 guard 추가. |
| 2026-03-21    | v0.2.0 | Phase 2 전체 구현. 하단 상세 참조. |
| 2026-03-21    | v0.2.1 | VSCode, Zed 클라이언트 추가. config-manager 포맷 분기(mcpServers/servers/context_servers), registry.json 전체 100개 supportedClients 업데이트, 렌더러 CLIENT_LABELS 업데이트. Phase 5 로드맵 추가. |
| 2026-03-21    | v0.3.0 | Phase 3 전체 구현. 하단 상세 참조. |
| 2026-03-21    | v0.4.0 | Phase 4 배포 준비 전체 구현. 하단 상세 참조. |
| 2026-03-21    | v0.4.0 | 배포 체크리스트 완료, GitHub push 완료. package.json/electron-builder.config.ts repository 설정 업데이트, .gitignore 생성, build/icon.svg 삭제, git init 및 origin push (aeolus9093/MCP_STORE), tag v0.4.0 생성. |
| 2026-03-21    | v0.5.0 | Phase 5 Auto Sync 전체 구현. 하단 상세 참조. |

---

## v0.1.0 구현 범위

### 생성된 파일 목록

**공유 타입**
- `src/shared/types.ts` — MCPPackage, InstalledMCP, IPC 채널 상수, 모든 페이로드 타입

**데이터**
- `packages/registry.json` — 20개 MCP 큐레이션 데이터 (plainDescription 포함)
  - github, filesystem, slack, notion, brave-search, puppeteer, sqlite, postgres
  - sequential-thinking, memory, fetch, gitlab, linear, google-maps, time
  - google-drive, aws-kb-retrieval, sentry, everything, jira

**Electron Main Process**
- `src/main/index.ts` — Electron 진입점, BrowserWindow 생성
- `src/main/preload.ts` — contextBridge로 window.mcpStore API 노출
- `src/main/config-manager.ts` — OS별 설정 파일 경로 자동 감지 (Windows/macOS/Linux), claude-desktop/cursor/windsurf/claude-code 4종 지원
- `src/main/installer.ts` — execa 기반 npm/npx/uvx/docker 설치, 실시간 로그 콜백
- `src/main/registry.ts` — zod 검증, 메모리 캐시, 텍스트/카테고리/클라이언트 필터
- `src/main/ipc-handlers.ts` — 모든 IPC 채널 등록, lowdb로 설치 목록 영속화

**React Renderer**
- `src/renderer/main.tsx` — React 진입점
- `src/renderer/App.tsx` — 루트 컴포넌트, 탭 라우팅
- `src/renderer/global.d.ts` — window.mcpStore 타입 선언
- `src/renderer/index.css` — Tailwind CSS 기본 스타일
- `src/renderer/store/appStore.ts` — Zustand 전역 상태
- `src/renderer/components/SearchBar.tsx` — 검색 + 카테고리 필터 (debounce 300ms)
- `src/renderer/components/MCPCard.tsx` — MCP 카드 UI
- `src/renderer/components/InstallButton.tsx` — 설치 상태별 버튼 (idle/installing/success/error)
- `src/renderer/components/EnvVarInput.tsx` — 환경 변수 입력 (secret 마스킹)
- `src/renderer/pages/Home.tsx` — 메인 목록 (스켈레톤 로딩 포함)
- `src/renderer/pages/Detail.tsx` — MCP 상세 + InstallWizard
- `src/renderer/pages/Installed.tsx` — 설치된 목록 + 토글 + 제거 모달

**설정 파일**
- `package.json` — npm scripts (dev, build, dist)
- `vite.config.ts` — Vite + React 설정
- `tsconfig.json` — Renderer TypeScript 설정
- `tsconfig.main.json` — Main Process TypeScript 설정 (CommonJS)
- `tailwind.config.js`
- `postcss.config.js`
- `electron-builder.config.ts`
- `index.html`

### 시작 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Vite + Electron 동시)
npm run dev

# 빌드
npm run build

# 배포 패키징
npm run dist
```

### 알려진 제약
- `npm run dev` 실행 시 Node.js, npm이 설치되어 있어야 함
- uvx 사용 MCP는 Python uv 설치 필요
- 설치된 MCP 목록은 `~/.mcp-store/installed.json`에 저장됨

---

## v0.2.0 구현 범위 (Phase 2)

### 변경 파일

**데이터**
- `packages/registry.json` — 20개 → **100개** MCP 큐레이션 (80개 추가)
  - 신규 카테고리: git, docker, playwright, figma, duckduckgo, tavily, wikipedia, arxiv, hackernews, discord, telegram, gmail, teams, google-calendar, google-sheets, todoist, asana, trello, confluence, obsidian, airtable, google-docs, mysql, mongodb, redis, elasticsearch, supabase, firebase, neon, pinecone, cloudflare, aws-s3, azure, gcp, terraform, digitalocean, railway, dropbox, onedrive, box, huggingface, openai, replicate, stability-ai, langsmith, weather, stripe, twilio, youtube, spotify, news, currency, reddit, hubspot, shopify, sendgrid, datadog, pagerduty, zendesk, salesforce, google-analytics 등
  - MCPPackage에 `usageExamples?`, `permissions?` 옵션 필드 추가

**공유 타입**
- `src/shared/types.ts` — `SortOption` 타입 추가, `SearchPayload.sort` 추가, `InstallPayload.client` → `clients: Client[]` (다중 클라이언트), MCPPackage 옵션 필드, 신규 IPC 상수 (REGISTRY_REFRESH, INSTALLED_CHECK_UPDATES, TOOLS_CHECK, BACKUP_EXPORT, BACKUP_IMPORT)

**Electron Main Process**
- `src/main/registry.ts` — Zod 스키마에 옵션 필드 추가, `searchPackages` 정렬 지원
- `src/main/backup-manager.ts` — **신규**: 백업 내보내기/가져오기 (`exportBackup`, `importBackup`)
- `src/main/ipc-handlers.ts` — 신규 핸들러 5개: REGISTRY_REFRESH, TOOLS_CHECK, INSTALLED_CHECK_UPDATES, BACKUP_EXPORT, BACKUP_IMPORT. INSTALL_MCP 다중 클라이언트 지원
- `src/main/preload.ts` — 신규 메서드: refreshRegistry, checkUpdates, checkTools, exportBackup, importBackup

**React Renderer**
- `src/renderer/global.d.ts` — 신규 API 타입 선언
- `src/renderer/store/appStore.ts` — 신규 상태: updatablePackages, toolsAvailable, setSortOption 등
- `src/renderer/App.tsx` — Settings 탭 추가, 앱 시작 시 DepsModal + 설치 목록 초기화
- `src/renderer/pages/Home.tsx` — SearchBar props 변경 (client 필터, sort 콜백)
- `src/renderer/pages/Detail.tsx` — InstallWizard 컴포넌트로 분리, usageExamples + permissions 섹션 추가
- `src/renderer/pages/Installed.tsx` — 업데이트 알림 배지, 비활성 배지
- `src/renderer/pages/Settings.tsx` — **신규**: 백업/복원 UI, 저장 경로 안내, 앱 정보
- `src/renderer/components/SearchBar.tsx` — 클라이언트 필터, 정렬 (인기순/이름순/최신순), 결과 수 표시
- `src/renderer/components/LogViewer.tsx` — **신규**: 자동 스크롤, 타임스탬프, 색상 코딩, 지우기 버튼
- `src/renderer/components/DepsModal.tsx` — **신규**: 의존성 미설치 감지 팝업 (Node.js/npm/uvx/Docker)
- `src/renderer/components/InstallWizard.tsx` — **신규**: 다중 클라이언트 체크박스 선택, LogViewer 통합

**가이드라인**
- `LLM_GUIDE.md` — **신규**: 다른 LLM이 MCP Store API를 사용하여 MCP를 설치하는 방법 문서화 (JavaScript 코드 예시 포함)

### Phase 2 기능 구현 현황

- [x] MCP 100개로 확장 (80개 수동 큐레이션, registry.json)
- [x] 검색 + 카테고리 + 클라이언트 필터 고도화 + 정렬 (stars-desc/name-asc/date-desc)
- [x] MCP별 상세 페이지 (사용 예시, 필요 권한 섹션)
- [x] 의존성 자동 감지 (DepsModal: Node.js/npm 미설치 시 설치 가이드 팝업)
- [x] 설치 로그 뷰어 개선 (자동 스크롤, 타임스탬프, 에러/성공 색상 코딩)
- [x] MCP 업데이트 알림 (lastUpdated vs installedAt 비교, 배지 표시)
- [x] 다중 클라이언트 동시 설치 (체크박스로 복수 선택)
- [x] 설정 백업 / 복원 (JSON 파일 내보내기/가져오기)
- [x] LLM 가이드라인 (LLM_GUIDE.md — window.mcpStore API 전체 문서화)

---

## v0.3.0 구현 범위 (Phase 3)

### 신규 파일 목록

**Electron Main Process**
- `src/main/github-sync.ts` — **신규**: GitHub API(`modelcontextprotocol/servers`) 폴링, 신규 MCP 감지, 캐시 저장(`~/.mcp-store/sync-cache.json`)
- `src/main/readme-fetcher.ts` — **신규**: officialSource URL → raw README URL 변환 + fetch (main/master 브랜치 fallback)
- `src/main/review-manager.ts` — **신규**: 사용자 리뷰/별점 로컬 저장(`~/.mcp-store/reviews.json`), upsert/조회/삭제
- `src/main/quality-scorer.ts` — **신규**: stars/recency/description/clients/envPenalty 기반 0–100점 자동 채점
- `src/main/ipc-handlers-community.ts` — **신규**: Phase 3 IPC 핸들러 분리 (github sync, readme, 검색히스토리, 리뷰, 품질점수)

**React Renderer**
- `src/renderer/utils/renderMarkdown.ts` — **신규**: 외부 패키지 없는 간이 마크다운 → HTML 변환기 (heading/code/list/bold/link/img 지원)
- `src/renderer/components/StarRating.tsx` — **신규**: 인터랙티브 별점 (1–5, hover 미리보기)
- `src/renderer/components/ReadmeSection.tsx` — **신규**: README 렌더링 섹션 (접기/펼치기, 스켈레톤)
- `src/renderer/components/ReviewSection.tsx` — **신규**: 리뷰/별점 저장 UI (코멘트 + 저장 버튼)
- `CONTRIBUTING.md` — **신규**: 커뮤니티 MCP 제출 가이드

### 변경 파일

**공유 타입**
- `src/shared/types.ts` — `Review`, `QualityScore`, `GitHubSyncResult` 타입 추가; `InstalledMCP.installedVersion?` 추가; Phase 3 IPC 상수 9개 추가

**Electron Main Process**
- `src/main/preload.ts` — Phase 3 API 12개 노출 (githubSync, fetchReadme, 검색히스토리, 리뷰, 품질점수)
- `src/main/index.ts` — `registerCommunityHandlers()` 호출 추가

**React Renderer**
- `src/renderer/global.d.ts` — Phase 3 window.mcpStore 타입 선언
- `src/renderer/store/appStore.ts` — `searchHistory`, `qualityScores` 상태 추가; `setSearchHistory`, `addSearchHistory`, `setQualityScores` 액션 추가
- `src/renderer/components/SearchBar.tsx` — 검색 히스토리 드롭다운 (최근 8개, 전체 삭제, 외부 클릭 닫기)
- `src/renderer/components/InstallWizard.tsx` — 설치 실패 자동 1회 재시도 + 수동 재시도 버튼
- `src/renderer/pages/Detail.tsx` — ReadmeSection + ReviewSection + QualityBadge(점수 분석 팝업) 통합
- `src/renderer/components/MCPCard.tsx` — 품질 점수 배지 표시 (색상: 우수=초록/양호=노랑/보통=주황/기본=회색)
- `src/renderer/pages/Settings.tsx` — GitHub 동기화 섹션 + Submit MCP(GitHub Issue 템플릿) + 저장 경로 안내 확장
- `src/renderer/App.tsx` — 사이드바 버전 v0.3.0
- `src/renderer/pages/Home.tsx` — 품질 점수 배치 로딩 (getBatchQualityScores)
- `package.json` — version 0.3.0

### Phase 3 기능 구현 현황

- [x] GitHub API 실시간 파싱 — `modelcontextprotocol/servers` 폴링, 신규 MCP 감지, 캐시 저장
- [x] MCP 버전 관리 — `InstalledMCP.installedVersion?` 필드 추가 (installer 연동은 Phase 4에서 확장)
- [x] 검색 히스토리 — 최근 10개 로컬 JSON 저장, 클릭 적용, 전체 삭제
- [x] MCP 상세 페이지 README 렌더링 — GitHub raw README fetch + 간이 마크다운 렌더러
- [x] 설치 실패 자동 재시도 — 2초 후 자동 1회 + 수동 재시도 버튼
- [x] 커뮤니티 MCP 제출 시스템 — Submit MCP 버튼(GitHub Issue 템플릿) + CONTRIBUTING.md
- [x] 사용자 리뷰/별점 — 로컬 JSON, StarRating 컴포넌트, 코멘트 저장
- [x] MCP 품질 자동 채점 — stars/recency/description/clients/envPenalty 5항목, 0–100점

### 저장 파일 구조 (v0.3.0 기준)

```
~/.mcp-store/
  installed.json        ← 설치된 MCP 목록
  search-history.json   ← 검색 히스토리 (최근 10개) [신규]
  reviews.json          ← 사용자 리뷰/별점 [신규]
  sync-cache.json       ← GitHub 동기화 캐시 [신규]
```

---

---

## v0.4.0 구현 범위 (Phase 4)

### 신규 파일 목록

**Electron Main Process**
- `src/main/auto-updater.ts` — **신규**: electron-updater 기반 자동 업데이트. `checkForUpdates`, `downloadUpdate`, `quitAndInstall`, 앱 시작 30초 후 백그라운드 자동 확인

**React Renderer**
- `src/renderer/components/UpdateNotification.tsx` — **신규**: 업데이트 상태별 배너 (checking / available / downloading / ready / error). 다운로드 진행률 표시, 재시작 버튼

**GitHub Actions**
- `.github/workflows/release.yml` — **신규**: `v*` 태그 push 시 Win/Mac/Linux 병렬 빌드 + GitHub Release 자동 생성. 코드 사이닝 환경변수 주석 포함

**빌드 리소스**
- `build/icon.svg` — **신규**: 512×512 placeholder SVG 아이콘 (배포 전 PNG/ICO/ICNS로 교체)
- `build/README_ICONS.md` — **신규**: 아이콘 파일 교체 가이드

**문서**
- `README.md` — **신규**: 프로젝트 소개, 스크린샷 섹션, 설치 방법(Win/Mac/Linux), 지원 클라이언트 표, 개발 환경 설정, 기여 방법

### 변경 파일

**공유 타입**
- `src/shared/types.ts` — `UPDATE_CHECK`, `UPDATE_DOWNLOAD`, `UPDATE_INSTALL`, `UPDATE_STATUS` IPC 상수 4개 추가

**Electron Main Process**
- `src/main/preload.ts` — `updateCheck`, `updateDownload`, `updateInstall`, `onUpdateStatus`, `offUpdateStatus` API 노출
- `src/main/index.ts` — `registerAutoUpdaterHandlers`, `scheduleUpdateCheck` 호출 추가

**React Renderer**
- `src/renderer/global.d.ts` — Phase 4 업데이트 API 타입 선언 추가
- `src/renderer/App.tsx` — `UpdateNotification` 컴포넌트 통합, 버전 v0.4.0

**설정**
- `electron-builder.config.ts` — 완성: Windows(NSIS+portable), macOS(DMG+pkg arm64/x64), Linux(AppImage+deb), 파일 포함/제외 명시, 코드사이닝 환경변수 주석, `extraResources` 설정
- `package.json` — version 0.4.0, `build:win` / `build:mac` / `build:linux` / `build:all` 스크립트 추가, `electron-updater` 의존성 추가, `repository` 필드 추가

### Phase 4 기능 구현 현황

- [x] electron-builder 완성 — Win(NSIS+포터블) / Mac(DMG+pkg, arm64+x64) / Linux(AppImage+deb)
- [x] 자동 업데이트 — electron-updater + GitHub Releases, 앱 시작 30초 후 자동 확인
- [x] UpdateNotification 컴포넌트 — 상태별 배너, 다운로드 진행률, 재시작 버튼
- [x] README.md — 프로젝트 소개, 스크린샷 섹션, 3-OS 설치 가이드, 지원 클라이언트 표
- [x] 빌드 스크립트 — build:win / build:mac / build:linux / build:all
- [x] GitHub Actions release.yml — v* 태그 push 시 3-OS 병렬 빌드 + 릴리즈
- [x] 아이콘 placeholder — build/icon.svg + 교체 가이드
- [x] 코드 사이닝 주석 — electron-builder.config.ts + release.yml 환경변수 안내

### 배포 체크리스트 (실제 릴리즈 전)

```
□ build/icon.png (512×512) 교체
□ build/icon.ico (Windows용) 교체
□ build/icon.icns (macOS용) 교체
□ package.json repository.url → 실제 GitHub URL
□ electron-builder.config.ts publish.owner/repo → 실제 값
□ GitHub Secrets 등록:
  - GH_TOKEN (자동 업데이트용)
  - WIN_CSC_LINK, WIN_CSC_KEY_PASSWORD (Windows 코드사이닝, 선택)
  - MAC_CSC_LINK, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID (macOS, 선택)
□ git tag v0.4.0 && git push origin v0.4.0 → Actions 자동 실행
```

---

## v0.5.0 구현 범위 (Phase 5 — Auto Sync)

### 신규 파일

- `src/main/description-generator.ts` — Claude Haiku API로 README → 한국어 일반인 설명 자동 생성. `~/.mcp-store/generated-descriptions.json`에 캐싱. API Key 없으면 오류 반환.
- `src/main/config-watcher.ts` — `fs.watch`로 6개 클라이언트 설정 파일 감시. 외부 MCP 추가/제거 감지 시 `installed.json` 자동 동기화 + `CONFIG_CHANGED` IPC push. 300ms 디바운스 적용.

### 변경 파일

**공유 타입**
- `src/shared/types.ts` — Phase 5 IPC 상수 8개 추가 (`SETTINGS_GET/SET`, `METADATA_REFRESH`, `METADATA_CACHE_GET`, `DESCRIPTION_GENERATE`, `DESCRIPTION_CACHE_GET`, `CONFIG_CHANGED`, `NEW_MCP_DETECTED`). `AppSettings`, `MetadataCacheEntry`, `MetadataCache` 인터페이스 추가.

**Electron Main Process**
- `src/main/github-sync.ts` — **ETag/If-None-Match Conditional Request** 지원으로 GitHub API rate limit 절약 (304 → 즉시 반환). `refreshMetadataForPackages()` 추가 (설치 MCP stars/lastUpdated → `~/.mcp-store/metadata-cache.json`). `startAutoSync(win, knownIdsGetter, intervalMs?)` — 앱 시작 2초 후 1회 + 6시간 주기 자동 폴링, 신규 MCP 감지 시 `NEW_MCP_DETECTED` IPC 이벤트 push. `stopAutoSync()` 추가.
- `src/main/ipc-handlers.ts` — `SETTINGS_GET/SET` 핸들러 (`~/.mcp-store/settings.json`). `METADATA_REFRESH/METADATA_CACHE_GET` 핸들러.
- `src/main/ipc-handlers-community.ts` — `DESCRIPTION_GENERATE` 핸들러 (README fetch → generateDescription 호출). `DESCRIPTION_CACHE_GET` 핸들러.
- `src/main/index.ts` — `startAutoSync`, `startConfigWatcher` 초기화. `autoSyncEnabled` 설정 확인 후 조건부 시작. `window-all-closed` 시 `stopAutoSync/stopConfigWatcher` 정리.
- `src/main/preload.ts` — Phase 5 IPC 채널 노출: `getSettings`, `setSettings`, `refreshMetadata`, `getMetadataCache`, `generateDescription`, `getDescriptionCache`, `onConfigChanged/offConfigChanged`, `onNewMcpDetected/offNewMcpDetected`.

**React Renderer**
- `src/renderer/pages/Settings.tsx` — **Claude API Key 섹션** (마스킹/표시 토글, `~/.mcp-store/settings.json` 저장). **Auto Sync 토글** (6h 주기 활성화/비활성화). **설치 MCP 메타데이터 갱신** 버튼. 데이터 저장 경로 안내에 Phase 5 파일 추가. 버전 표시 v0.5.0.
- `src/renderer/global.d.ts` — Phase 5 메서드 타입 선언 추가.

### Phase 5 기능 구현 현황

- [x] GitHub API ETag Conditional Requests — 304 Not Modified 처리, rate limit 절약
- [x] 앱 시작 1회 + 6시간 주기 Auto Sync — `startAutoSync`
- [x] 신규 MCP 감지 → `NEW_MCP_DETECTED` IPC 이벤트 push
- [x] 설치 MCP stars/lastUpdated 주기적 갱신 → `metadata-cache.json`
- [x] `description-generator.ts` — Claude Haiku로 README → 한국어 설명 자동 생성
- [x] 생성 설명 `generated-descriptions.json` 캐싱
- [x] `config-watcher.ts` — fs.watch + 디바운스 300ms, `CONFIG_CHANGED` IPC push
- [x] 외부 MCP 추가/제거 → `installed.json` 자동 동기화
- [x] Settings 탭 — API Key 입력(마스킹), Auto Sync 토글, 설정 저장
- [x] README.md fix — URL 수정(aeolus9093/MCP_STORE), 깨진 이미지 제거

### 데이터 파일 (Phase 5 신규)

```
~/.mcp-store/settings.json              — { claudeApiKey, autoSyncEnabled }
~/.mcp-store/generated-descriptions.json — { [packageId]: { description, generatedAt } }
~/.mcp-store/metadata-cache.json         — { [packageId]: { stars, lastUpdated, fetchedAt } }
~/.mcp-store/sync-cache.json             — (기존 + etag 필드 추가)
```

---

## Phase 6 — 미정
