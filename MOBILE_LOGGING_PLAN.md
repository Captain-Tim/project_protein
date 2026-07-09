# 手機端記錄訓練資料 — 現況與規劃

> 2026-07-09 討論紀錄。目的:在不碰 Notion、不額外自架服務的前提下,讓外出手機拍照記錄訓練這件事重新動起來。
> `CLAUDE.md` §5 的「手機端寫入合約」(`data/pending/<date>-<random6>.json` 的 schema)不變,這份文件只處理
> 「東西怎麼從手機送到那個路徑」這一段。

## 1. 問題

原本的架構假設 claude.ai 網頁/App 能透過「GitHub connector」直接建立/寫入 repo 檔案,實測發現不成立
(見 §2)。目前 `data/pending/`、`review.cmd`、`promote_pending.js`、`build_dashboard.js`、GitHub Pages 部署都已
就緒且驗證過,唯獨「手機端怎麼把新紀錄送進 `data/pending/`」這一段還沒有可行方案。

## 2. 已排除/撞牆的方案

| 方案 | 結果 | 原因 |
|---|---|---|
| A. Notion 復活當中繼站 | 使用者排除 | 明確不想再碰 Notion,即使只是當中繼站 |
| B. Google Drive 當中繼站 | 使用者覺得麻煩 | 資料量小,不想多一個資料存放點;且沒有這專案的實戰驗證 |
| C. claude.ai 官方 GitHub connector(OAuth) | **技術上撞牆** | claude.ai 的「Add custom connector」對話框對 `api.githubcopilot.com/mcp` 只給 OAuth,無法塞自訂 PAT/header;實際授權後呼叫寫入工具回 `403 Resource not accessible by integration`——這是官方 GitHub MCP server 已知、尚未解決的上游問題([issue #283](https://github.com/github/github-mcp-server/issues/283)、[issue #1610](https://github.com/github/github-mcp-server/issues/1610)),不是設定錯誤 |
| D. 自架客製 MCP server | 使用者不想做 | 工程量太大(要寫 HTTP MCP server、選部署平台、處理認證),對這個小需求殺雞用牛刀 |
| E. Composio / Zapier 代管 MCP | 未實測,擱置 | 需要另外註冊第三方平台帳號,使用者傾向資料/流程單純只留 GitHub |
| F. Claude Routines(排程雲端 agent) | **結構性不合適** | Routine 執行時是真正有 git 寫入能力的 Claude Code 雲端 agent(這點是對的),但觸發機制只有「固定時間排程」或「重跑同一個寫死的 prompt」,**沒有「這次帶著剛拍的照片當輸入」的動態內容管道**——這不是頻率問題(即使一天只跑一次也一樣沒用),是每次觸發都拿不到新的手機端內容 |

## 3. 目前提議的方案:GitHub Issue Form(捕捉)+ 每日 Routine(處理)

結合 §2 的發現:Issue 提供「手機端零 AI、零 connector 就能送資料進 GitHub」的原生管道,Routine 提供「真正
能寫檔案的 AI 處理能力」,兩者接起來剛好互補,且都不需要額外的第三方帳號或自架服務。

**流程**
1. **手機端捕捉**:repo 新增 `.github/ISSUE_TEMPLATE/log-workout.yml` 這個 Issue Form 範本。使用者用 GitHub
   手機 App 開新 Issue、套用範本、上傳照片和/或打幾個字描述,直接送出。GitHub 原生支援圖片附件,不需要
   任何 AI 或額外設定。
2. **每日(或手動)處理**:在 claude.ai 建立一個 Routine(Claude Code 雲端 agent,repo 設為
   `Captain-Tim/project_protein`)。Prompt 內直接寫入完整的解析邏輯(對照 skill 裡的動作對照表、單位規則、
   schema 規則),排程每天跑一次:
   - 用 `gh issue list` 找出當天新的、帶 `workout-log` 標籤的 issue
   - 讀取內文(含照片連結)解析成 `data/pending/<date>-<random6>.json` 的格式
   - 寫入該路徑,`git commit` + `git push`
   - 把處理過的 issue 關閉或改標籤,避免重複處理
3. 使用者也可以隨時手動觸發這個 routine(claude.ai 介面上 Run now),不用等排程時間——對應「真的需要
   即時資訊就手動更新」的需求。

**這個方案的優點**
- 捕捉端(Issue)零 AI、零 connector,GitHub 原生功能
- 處理端(Routine)是真正的 Claude Code agent,git 寫入是原生能力,不會撞到 C 方案遇到的 OAuth/MCP 問題
- 不需要另外申請/付費 Anthropic API key——Routine 用的是使用者 claude.ai 帳號本身的額度
- 不引入 Notion、Drive 或任何第三方平台,資料全程只在 GitHub

**使用者已確認的前提**
- **不需要即時更新 dashboard**,一天處理一次可以接受;真的需要更新再手動觸發 routine 或跑 `publish.cmd`
- 這條路目前是**提議**,還沒有實際建立 Issue Form 或 Routine,下一步才要做

## 4. 下一步(回家後決定要不要繼續)

1. 我這邊要寫:`.github/ISSUE_TEMPLATE/log-workout.yml`(Issue Form 範本)
2. 使用者那邊要做:去 claude.ai 建立每日 Routine,repo 指向 `Captain-Tim/project_protein`,prompt 我可以先
   幫忙草擬,需要使用者確認排程時間、模型(預設 `claude-sonnet-5`)
3. 兩邊都設好後,實際測一輪:開一個測試 issue → 手動觸發 routine → 確認 `data/pending/` 有出現對應檔案且
   格式正確 → `review.cmd` 核准 → `publish.cmd` 確認 dashboard 更新
