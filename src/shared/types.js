"use strict";
// =============================================================
// shared/types.ts — 프론트/백엔드 공유 타입 정의
// =============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC = void 0;
// ──────────────────────────────────────────────
// IPC 채널 상수
// ──────────────────────────────────────────────
exports.IPC = {
    // Registry
    REGISTRY_GET_ALL: "registry:getAll",
    REGISTRY_SEARCH: "registry:search",
    // Installer
    INSTALL_MCP: "install:mcp",
    INSTALL_LOG: "install:log",
    // Config
    CONFIG_GET_PATHS: "config:getPaths",
    CONFIG_ADD_MCP: "config:addMcp",
    CONFIG_REMOVE_MCP: "config:removeMcp",
    CONFIG_TOGGLE_MCP: "config:toggleMcp",
    // Installed list
    INSTALLED_GET_ALL: "installed:getAll",
    INSTALLED_REMOVE: "installed:remove",
};
