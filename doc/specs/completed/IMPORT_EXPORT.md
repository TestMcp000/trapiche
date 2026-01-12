# Import/Export Feature - Product Requirements Document (PRD)

> **Version**: 2.5  
> **Last Updated**: 2026-01-03  
> **Status**: Implemented - Reviewed (see `doc/SPEC.md`)  
> **Owner**: Site Owner (Single User)  
> **Priority**: P3 (Nice-to-Have, per ROADMAP.md)

本文件定位：保留「為什麼這樣設計」與關鍵決策；技術契約/格式/流程以 `doc/specs/completed/import-export-spec.md` 為準，避免重複造成 drift。

---

## 決策摘要

| 項目 | 決定 |
| --- | --- |
| Blog Posts 格式 | Markdown（frontmatter + 雙語內容） |
| 其他資料格式 | JSON |
| 單次匯入上限 | 100 筆記錄 |
| Dry Run 模式 | 必須支援（Preview，不寫入） |
| 權限控制 | Owner: 全功能 / Editor: 僅 Export |
| 圖片處理 | 只匯出 URL，不處理實際圖檔 |
| 關聯欄位 | 用 slug 表示（匯入時自動對應） |
| 敏感資料 | 匯出時可選擇排除 |
| CSV 時間格式 | ISO 8601 UTC |
| CSV 金額格式 | cents（整數） |
| CSV null 值 | 空字串（pandas 相容） |
| 匯入錯誤恢復 | 支援續跑（不中斷整批） |
| 失敗回滾策略 | DB Transaction 全部 Rollback |

---

## Scope

### In Scope

- Admin-only 匯出（Blog/Gallery/Shop/Content/Comments 等）
- Admin-only 匯入（Blog ZIP + JSON 匯入）
- Dry Run preview + validation（避免誤操作）

### Out of Scope

- 圖片檔案搬移（僅處理 URL）
- 即時雙向同步
- 匯入 auth/users 或任何認證資料

---

## Technical Spec (Single Source)

- Canonical spec: `import-export-spec.md`
- Key anchors（常用入口）:
  - Formats: `import-export-spec.md#2-格式規格`
  - UI: `import-export-spec.md#3-ui-規劃`
  - Import flow: `import-export-spec.md#4-匯入流程`
  - Security: `import-export-spec.md#6-安全性考量`

---

## Implementation Status（2026-01-03）

> 本段不列 repo 現況細節；現況以 `doc/SPEC.md` 為準，計畫以 `doc/ROADMAP.md` 為準。

- Implemented behavior (SSoT): [Import/Export](../../SPEC.md#importexport-admin-only)
- Pending / planned work: [ROADMAP.md](../../ROADMAP.md)
- Operational enablement / verification: [RUNBOOK.md](../../RUNBOOK.md)
- Security / RLS / secrets: [SECURITY.md](../../SECURITY.md)
- Historical logs / code maps: [Import/Export spec](import-export-spec.md), [Archive index](../../archive/README.md)

---

## Related

- Parent: [DATA_INTELLIGENCE.md](./DATA_INTELLIGENCE.md)
- Constraints: `../../../ARCHITECTURE.md`
- Drift tracker (stable `@see`): `../../../uiux_refactor.md`
