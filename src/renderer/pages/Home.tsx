// =============================================================
// renderer/pages/Home.tsx — 메인 MCP 목록 페이지 (다크테마)
// =============================================================

import { useEffect, useCallback } from "react";
import { useAppStore }  from "../store/appStore";
import SearchBar        from "../components/SearchBar";
import MCPCard          from "../components/MCPCard";
import { MCPPackage, MCPCategory, Client, SortOption } from "../../shared/types";

interface HomeProps {
  onSelectPackage: (pkg: MCPPackage) => void;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#141720", border: "1px solid #1f2535" }}
    >
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: "#1f2535" }} />
      </div>
      <div className="h-5 w-32 rounded mb-2 animate-pulse" style={{ background: "#1f2535" }} />
      <div className="h-4 w-full rounded mb-1 animate-pulse" style={{ background: "#1a1d27" }} />
      <div className="h-4 w-3/4 rounded animate-pulse"      style={{ background: "#1a1d27" }} />
    </div>
  );
}

export default function Home({ onSelectPackage }: HomeProps) {
  const {
    filteredPackages, installed, isLoading, error,
    searchPayload,
    setPackages, setFilteredPackages, setSearchPayload,
    setQualityScores,
    setLoading, setError,
  } = useAppStore();

  useEffect(() => {
    (async () => {
      if (!window.mcpStore) {
        setError("Electron 앱으로 실행해주세요. 브라우저에서는 동작하지 않습니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await window.mcpStore.getAll();
        if (result.success && result.data) {
          setPackages(result.data);
          // 품질 점수 배치 로딩 (오류 무시)
          window.mcpStore.getBatchQualityScores().then((qResult) => {
            if (qResult.success && qResult.data) setQualityScores(qResult.data);
          }).catch(() => {});
        } else {
          setError(result.error ?? "목록을 불러오지 못했습니다.");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [setPackages, setLoading, setError]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!window.mcpStore) return;
      const payload = { ...searchPayload, query: query || undefined };
      setSearchPayload(payload);
      const result = await window.mcpStore.search(payload);
      if (result.success && result.data) setFilteredPackages(result.data);
    },
    [searchPayload, setSearchPayload, setFilteredPackages]
  );

  const handleCategoryChange = useCallback(
    async (category: MCPCategory | undefined) => {
      if (!window.mcpStore) return;
      const payload = { ...searchPayload, category };
      setSearchPayload(payload);
      const result = await window.mcpStore.search(payload);
      if (result.success && result.data) setFilteredPackages(result.data);
    },
    [searchPayload, setSearchPayload, setFilteredPackages]
  );

  const handleClientChange = useCallback(
    async (client: Client | undefined) => {
      if (!window.mcpStore) return;
      const payload = { ...searchPayload, client };
      setSearchPayload(payload);
      const result = await window.mcpStore.search(payload);
      if (result.success && result.data) setFilteredPackages(result.data);
    },
    [searchPayload, setSearchPayload, setFilteredPackages]
  );

  const handleSortChange = useCallback(
    async (sort: SortOption) => {
      if (!window.mcpStore) return;
      const payload = { ...searchPayload, sort };
      setSearchPayload(payload);
      const result = await window.mcpStore.search(payload);
      if (result.success && result.data) setFilteredPackages(result.data);
    },
    [searchPayload, setSearchPayload, setFilteredPackages]
  );

  const installedIds = new Set(installed.map((i) => i.packageId));

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>MCP Store</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          AI 도구를 클릭 한 번으로 설치하세요
        </p>
      </div>

      <SearchBar
        totalCount={filteredPackages.length}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onClientChange={handleClientChange}
        onSortChange={handleSortChange}
      />

      {error && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: "#2d1a1a", border: "1px solid #7f1d1d", color: "#fca5a5" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : filteredPackages.length === 0
          ? (
            <div className="col-span-full text-center py-12" style={{ color: "#475569" }}>
              검색 결과가 없습니다.
            </div>
          )
          : filteredPackages.map((pkg) => (
            <MCPCard
              key={pkg.id}
              pkg={pkg}
              isInstalled={installedIds.has(pkg.id)}
              onClick={onSelectPackage}
            />
          ))
        }
      </div>
    </div>
  );
}
