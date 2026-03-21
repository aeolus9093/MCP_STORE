// =============================================================
// renderer/store/appStore.ts — Zustand 전역 상태 관리
// 패키지 목록, 설치 상태, 로그, 설치된 목록
// =============================================================

import { create } from "zustand";
import {
  MCPPackage,
  InstalledMCP,
  Client,
  SearchPayload,
  InstallStatus,
  SortOption,
  QualityScore,
} from "../../shared/types";

// ──────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────

export interface InstallState {
  status: InstallStatus;
  logs: string[];
  error?: string;
}

interface AppState {
  // 패키지 목록
  packages: MCPPackage[];
  filteredPackages: MCPPackage[];
  selectedPackage: MCPPackage | null;

  // 검색 필터
  searchPayload: SearchPayload;

  // 설치 상태 (packageId → InstallState)
  installStates: Record<string, InstallState>;

  // 설치된 목록
  installed: InstalledMCP[];

  // 선택된 클라이언트
  selectedClient: Client;

  // 업데이트 가능한 패키지 ID 목록
  updatablePackages: string[];

  // 도구 설치 여부 (node, npm, npx, uvx, docker)
  toolsAvailable: Record<string, boolean>;

  // 검색 히스토리
  searchHistory: string[];

  // 품질 점수 캐시 (packageId → QualityScore)
  qualityScores: Record<string, QualityScore>;

  // 로딩
  isLoading: boolean;
  error: string | null;

  // 액션
  setPackages:           (packages: MCPPackage[]) => void;
  setFilteredPackages:   (packages: MCPPackage[]) => void;
  selectPackage:         (pkg: MCPPackage | null) => void;
  setSearchPayload:      (payload: SearchPayload) => void;
  setSortOption:         (sort: SortOption) => void;
  setInstallStatus:      (packageId: string, status: InstallStatus, error?: string) => void;
  appendLog:             (packageId: string, line: string) => void;
  clearLogs:             (packageId: string) => void;
  setInstalled:          (list: InstalledMCP[]) => void;
  updateInstalledToggle: (packageId: string, client: Client, isActive: boolean) => void;
  removeFromInstalled:   (packageId: string, client: Client) => void;
  setSelectedClient:     (client: Client) => void;
  setUpdatablePackages:  (ids: string[]) => void;
  setToolsAvailable:     (tools: Record<string, boolean>) => void;
  setSearchHistory:      (history: string[]) => void;
  addSearchHistory:      (query: string) => void;
  setQualityScores:      (scores: Record<string, QualityScore>) => void;
  setLoading:            (v: boolean) => void;
  setError:              (e: string | null) => void;
}

// ──────────────────────────────────────────────
// 스토어
// ──────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  packages:          [],
  filteredPackages:  [],
  selectedPackage:   null,
  searchPayload:     { sort: "stars-desc" },
  installStates:     {},
  installed:         [],
  selectedClient:    "claude-desktop",
  updatablePackages: [],
  toolsAvailable:    {},
  searchHistory:     [],
  qualityScores:     {},
  isLoading:         false,
  error:             null,

  setPackages: (packages) =>
    set({ packages, filteredPackages: packages }),

  setFilteredPackages: (filteredPackages) =>
    set({ filteredPackages }),

  selectPackage: (selectedPackage) =>
    set({ selectedPackage }),

  setSearchPayload: (searchPayload) =>
    set({ searchPayload }),

  setSortOption: (sort) =>
    set((state) => ({ searchPayload: { ...state.searchPayload, sort } })),

  setInstallStatus: (packageId, status, error) =>
    set((state) => ({
      installStates: {
        ...state.installStates,
        [packageId]: {
          ...state.installStates[packageId],
          status,
          error,
          logs: state.installStates[packageId]?.logs ?? [],
        },
      },
    })),

  appendLog: (packageId, line) =>
    set((state) => {
      const prev = state.installStates[packageId] ?? { status: "idle", logs: [] };
      return {
        installStates: {
          ...state.installStates,
          [packageId]: { ...prev, logs: [...prev.logs, line] },
        },
      };
    }),

  clearLogs: (packageId) =>
    set((state) => ({
      installStates: {
        ...state.installStates,
        [packageId]: { ...(state.installStates[packageId] ?? { status: "idle" }), logs: [] },
      },
    })),

  setInstalled: (installed) => set({ installed }),

  updateInstalledToggle: (packageId, client, isActive) =>
    set((state) => ({
      installed: state.installed.map((i) =>
        i.packageId === packageId && i.client === client ? { ...i, isActive } : i
      ),
    })),

  removeFromInstalled: (packageId, client) =>
    set((state) => ({
      installed: state.installed.filter(
        (i) => !(i.packageId === packageId && i.client === client)
      ),
    })),

  setSelectedClient:    (selectedClient)    => set({ selectedClient }),
  setUpdatablePackages: (updatablePackages) => set({ updatablePackages }),
  setToolsAvailable:    (toolsAvailable)    => set({ toolsAvailable }),

  setSearchHistory:     (searchHistory)     => set({ searchHistory }),
  addSearchHistory: (query) =>
    set((state) => {
      const cleaned = state.searchHistory.filter((q) => q !== query);
      return { searchHistory: [query, ...cleaned].slice(0, 10) };
    }),

  setQualityScores:     (qualityScores)     => set({ qualityScores }),

  setLoading:           (isLoading)         => set({ isLoading }),
  setError:             (error)             => set({ error }),
}));
