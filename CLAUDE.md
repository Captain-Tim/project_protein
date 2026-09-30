# Project Protein

Captain 與 Monkey 各有一個自含、零外部依賴的 HTML dashboard。資料在地維護並以 git 版控，
`master` 經 GitHub Pages 公開部署。

技術限制：純 HTML、CSS、vanilla JS 與手寫 SVG，建置腳本使用 Node 18+。不要引入框架、
圖表函式庫或 Python。

## 全域規則

- `data/<人名>/` 是訓練資料的唯一真相。資料夾表示擁有者，JSON 不存人名，也不存能由來源欄位推導的值
- 所有人物共用 [scripts/build_dashboard.js](scripts/build_dashboard.js)。驗證失敗時修正來源資料，不要繞過檢查。必要欄位不明時先詢問使用者
- HTML 中 `/*…_START*/` 至 `/*…_END*/` 的內容只能由 build 腳本產生，不要手動修改
- 新增公開頁面時，同時更新 [scripts/make_site.js](scripts/make_site.js) 的 `SITE` 與 [.github/workflows/pages.yml](.github/workflows/pages.yml) 的 `paths`
- spec 是現況的唯一說明，不是開發日誌。功能改變時同步更新對應 spec，不在檔名或內容保留建立歷程

## Git 與部署

所有變更都走 PR，不直接推 `master`。`master` 代表已上線，merge 會觸發部署。

本機流程：建立分支並 commit，提供 `git push -u origin <分支>` 讓使用者執行。等使用者確認 push 完成後才開 PR，
等 `validate` 通過且使用者同意後，使用 `gh pr merge <PR#> --squash --delete-branch` 合併。

遠端 session（手機版）由 Claude 自己 push 分支，不用等使用者。開 PR 與 merge 仍要等使用者說。
遠端 session 沒有 `gh` 時，使用可寫入的 GitHub MCP。若其中一個 server 回 403，改用另一個。MCP merge 後執行
`git branch -D <分支>`，遠端分支由 repo 設定自動刪除。

CI 的命令與執行順序以 [.github/workflows/pages.yml](.github/workflows/pages.yml) 為準。送 PR 前在本機重跑同一組 `validate`。

## 依任務載入文件

- 新增訓練紀錄：[.claude/skills/log-workout/SKILL.md](.claude/skills/log-workout/SKILL.md)
- 記錄睡眠：[.claude/skills/log-sleep/SKILL.md](.claude/skills/log-sleep/SKILL.md)
- 使用炸雞券：[.claude/skills/use-coupon/SKILL.md](.claude/skills/use-coupon/SKILL.md)
- 調整頁面區塊順序：[docs/page-layout.md](docs/page-layout.md)
- 驗證桌面或手機畫面：[docs/verification.md](docs/verification.md)
- 修改特定功能：讀取 [docs/specs/](docs/specs/) 中對應的 spec
