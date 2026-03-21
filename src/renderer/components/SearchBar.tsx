// =============================================================
// renderer/components/SearchBar.tsx — 검색 + 카테고리 + 클라이언트 + 정렬
// Phase 3: 검색 히스토리 드롭다운 추가 (다크테마)
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { MCPCategory, Client, SortOption } from "../../shared/types";
import { useAppStore } from "../store/appStore";

const CATEGORY_LABELS: Record<MCPCategory | "all", string> = {
  all:           "전체",
  dev:           "개발",
  productivity:  "생산성",
  search:        "검색",
  file:          "파일",
  database:      "데이터베이스",
  ai:            "AI",
  communication: "커뮤니케이션",
  cloud:         "클라우드",
  other:         "기타",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as (MCPCategory | "all")[];

const CLIENT_LABELS: Record<Client | "all", string> = {
  all:              "전체",
  "claude-desktop": "Claude Desktop",
  cursor:           "Cursor",
  windsurf:         "Windsurf",
  "claude-code":    "Claude Code",
  vscode:           "VS Code",
  zed:              "Zed",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "stars-desc", label: "⭐ 인기순" },
  { value: "name-asc",   label: "🔤 이름순" },
  { value: "date-desc",  label: "🕐 최신순" },
];

interface SearchBarProps {
  totalCount:       number;
  onSearch:         (query: string) => void;
  onCategoryChange: (category: MCPCategory | undefined) => void;
  onClientChange:   (client: Client | undefined) => void;
  onSortChange:     (sort: SortOption) => void;
}

export default function SearchBar({
  totalCount,
  onSearch,
  onCategoryChange,
  onClientChange,
  onSortChange,
}: SearchBarProps) {
  const [inputValue,      setInputValue]     = useState("");
  const [activeCategory,  setActiveCategory] = useState<MCPCategory | "all">("all");
  const [activeClient,    setActiveClient]   = useState<Client | "all">("all");
  const [activeSort,      setActiveSort]     = useState<SortOption>("stars-desc");
  const [showHistory,     setShowHistory]    = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    searchHistory,
    setSearchHistory,
    addSearchHistory: addHistoryToStore,
  } = useAppStore();

  // 히스토리 초기 로딩
  useEffect(() => {
    (async () => {
      if (!window.mcpStore) return;
      const result = await window.mcpStore.getSearchHistory();
      if (result.success && result.data) setSearchHistory(result.data);
    })();
  }, [setSearchHistory]);

  // 검색 debounce
  useEffect(() => {
    const timer = setTimeout(() => onSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue, onSearch]);

  // 외부 클릭 시 히스토리 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commitSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      addHistoryToStore(query);
      window.mcpStore?.addSearchHistory(query);
    },
    [addHistoryToStore]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSearch(inputValue);
      setShowHistory(false);
    } else if (e.key === "Escape") {
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (query: string) => {
    setInputValue(query);
    setShowHistory(false);
    onSearch(query);
  };

  const handleClearHistory = async () => {
    setSearchHistory([]);
    await window.mcpStore?.clearSearchHistory();
  };

  const handleCategoryClick = useCallback(
    (cat: MCPCategory | "all") => {
      setActiveCategory(cat);
      onCategoryChange(cat === "all" ? undefined : (cat as MCPCategory));
    },
    [onCategoryChange]
  );

  const handleClientClick = useCallback(
    (client: Client | "all") => {
      setActiveClient(client);
      onClientChange(client === "all" ? undefined : (client as Client));
    },
    [onClientChange]
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      setActiveSort(sort);
      onSortChange(sort);
    },
    [onSortChange]
  );

  return (
    <div className="space-y-3">
      {/* 검색 + 정렬 */}
      <div className="flex gap-3 items-center">
        {/* 텍스트 검색 (히스토리 드롭다운 포함) */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#475569" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onKeyDown={handleKeyDown}
            placeholder="MCP 이름, 기능으로 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{
              background: "#141720",
              border:     "1px solid #1f2535",
              color:      "#e2e8f0",
            }}
            onFocusCapture={(e) => (e.target.style.border = "1px solid #3b82f6")}
            onBlur={(e)  => (e.target.style.border = "1px solid #1f2535")}
          />

          {/* 히스토리 드롭다운 */}
          {showHistory && searchHistory.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{ background: "#141720", border: "1px solid #1f2535" }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: "1px solid #1f2535" }}
              >
                <span className="text-xs font-medium" style={{ color: "#475569" }}>
                  최근 검색어
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs transition-colors"
                  style={{ color: "#475569" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#475569")}
                >
                  전체 삭제
                </button>
              </div>
              {searchHistory.slice(0, 8).map((query) => (
                <button
                  key={query}
                  onClick={() => handleHistoryClick(query)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#1f2535")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  <span style={{ color: "#475569", fontSize: "0.75em" }}>🕐</span>
                  {query}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정렬 선택 */}
        <div className="flex gap-1.5 shrink-0">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: activeSort === opt.value ? "#1e3a5f" : "#141720",
                border:     activeSort === opt.value ? "1px solid #3b82f6" : "1px solid #1f2535",
                color:      activeSort === opt.value ? "#60a5fa"  : "#64748b",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: activeCategory === cat ? "#2563eb" : "#1f2535",
              color:      activeCategory === cat ? "#fff"     : "#94a3b8",
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 클라이언트 필터 + 결과 수 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CLIENT_LABELS) as (Client | "all")[]).map((c) => (
            <button
              key={c}
              onClick={() => handleClientClick(c)}
              className="px-2.5 py-0.5 rounded-lg text-xs transition-colors"
              style={{
                background: activeClient === c ? "#1a2d4e" : "#141720",
                border:     activeClient === c ? "1px solid #3b82f6" : "1px solid #1f2535",
                color:      activeClient === c ? "#60a5fa"  : "#64748b",
              }}
            >
              {CLIENT_LABELS[c]}
            </button>
          ))}
        </div>
        <span className="text-xs shrink-0" style={{ color: "#475569" }}>
          {totalCount}개
        </span>
      </div>
    </div>
  );
}
