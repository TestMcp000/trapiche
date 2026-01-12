# Admin 後台載入效能改善 — 已完成項目歸檔（Admin Performance Archive）

> **Date**: 2025-12-31  
> **Status**: COMPLETE（歸檔：`doc/TASKS.md` 只保留未完成項目）  
> **Active**: `doc/ROADMAP.md`（如有後續效能項目，以 roadmap 為準）  
> **Related**: `ARCHITECTURE.md`, `uiux_refactor.md`, `doc/specs/completed/DATA_PREPROCESSING.md`

## Summary

本檔用來存放已完成的 admin performance 改善項目，避免 `doc/TASKS.md` 混雜「已做完」與「待做」兩種語意。

## Changes

### 1) Dependency Isolation（Admin-only heavy deps + 預載控制）

- Admin navigation 關閉預載，避免一進後台就拉一堆 route chunks：
  - `components/admin/common/AdminSidebar.tsx`（`prefetch={false}`）
  - `components/admin/common/AdminTabs.tsx`（`prefetch={false}`）
- Heavy deps 維持 admin route 範圍內 dynamic import（沿用既有 patterns；避免 public bundle 漏入）

### 2) Server-side Caching（preprocessing_config cached read）

- `preprocessing_config` 讀取收斂為 cached read（TTL + tag revalidate）：
  - `lib/preprocessing/cached.ts`
  - `lib/preprocessing/config-io.ts`
- Admin 寫入後透過 `revalidateTag()` 讓 worker/cron 在短時間內吃到最新 config（行為對齊 `ARCHITECTURE.md` 的 caching 约束）

### 3) Async Request Separation（Cron dispatcher + Worker endpoint）

- Cron endpoint 只做 dispatcher（避免把 Clean/Chunk/Embed 放在 cron request life cycle）：
  - `app/api/cron/embedding-queue/route.ts`
- Worker endpoint 專職跑重型任務（獨立 `WORKER_SECRET` 權限）：
  - `app/api/worker/embedding-queue/route.ts`

### 4) Use-case 收斂（Single entry point）

- 將「讀 config → 抓 content → preprocess → embed → queue status」收斂到單一入口：
  - `lib/preprocessing/preprocess-use-case-io.ts`

## Verification

- `npm test`
- `npm run type-check`
- `npm run lint`
