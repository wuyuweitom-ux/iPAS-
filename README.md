# 🌿 iPAS 淨零碳規劃師 AI 備考系統 (純靜態網頁版 / GitHub Pages Ready)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Static-GitHub%20Pages-blue.svg)](https://pages.github.com/)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Gemini API](https://img.shields.io/badge/Google%20GenAI-Gemini%20API-orange.svg)](https://aistudio.google.com/)
[![Zero-Leak Security](https://img.shields.io/badge/Security-Zero--Leak%20API%20Key-brightgreen.svg)](#-api-key-安全性與零外洩保證-zero-leak-architecture)

專為準備經濟部 **iPAS「淨零碳規劃師」能力鑑定考試** 考生量身打造的**純靜態網頁 (Static Web App)** 備考系統。支援直接發布至 **GitHub Pages**、Vercel、Netlify 或任何靜態主機，且同時提供終端 Python CLI 腳本。

---

## 🛡️ API Key 安全性與零外洩保證 (Zero-Leak Architecture)

在靜態網頁架構中，最忌諱將私人 API Key 打包進前端原始碼或上傳至公開 GitHub 倉庫中。本專案採用最嚴格的 **BYOK (Bring Your Own Key) 純客戶端安全設計**：

1. **原始碼 100% 零金鑰**：專案程式碼、環境設定與 Git 紀錄中，絕不包含任何私密金鑰，上傳公開 GitHub 倉庫絕無洩漏風險。
2. **本機瀏覽器孤立儲存**：若使用者需要連線動態 AI，金鑰僅暫存於使用者個人電腦之瀏覽器 `localStorage` 中。
3. **官方直接通訊**：瀏覽器直接與 Google 官方端點 (`generativelanguage.googleapis.com`) 進行通訊，不經由任何第三方伺服器轉發，杜絕中間人側錄。
4. **免金鑰離線運作 (Offline Mode)**：即使不填寫 API Key，系統依然**完全開放使用** 40+ 題精選模擬題庫、各題官方詳解、法規引證、標準速查圖譜與內建常見考點知識庫解答！

---

## 🌟 核心特色 (Key Features)

1. **💡 蘇格拉底式啟發引導（不直接公布答案）**
   - 遇選擇題或考古題提問時，助教不直接提供 ABCD 選項答案，而是先梳理考點架構、法規關鍵字與判斷邏輯，刺激自主思考。
2. **🎯 盲點精準診斷與國際標準引證**
   - 答錯或觀念混淆時，直接指出思維盲區（如「組織邊界股權比例 vs 營運控制」、「範疇二市場基礎法 vs 地點基礎法」、「類別三上游運輸 vs 類別四採購商品」）。
   - 精確引用：
     - **ISO 14064-1:2018**（組織溫室氣體盤查與報告）
     - **ISO 14067:2018**（產品碳足跡量化標準與 LCA）
     - **GHG Protocol**（溫室氣體盤查議定書 Scope 1~3）
     - **台灣《氣候變遷因應法》** 與環境部碳費徵收三子法
     - **歐盟碳邊境調整機制 (CBAM)** 及 **SBTi** 科學基礎目標
3. **📚 精選歷屆模擬試題庫**
   - 包含科目一（淨零法規）與科目二（溫盤與碳足跡實務）高頻考點，支援「觀念提示」、「即時批改」與「一鍵帶入 AI 助教深入解惑」。
4. **📖 核心規範速查圖譜**
   - 內建 ISO 14064-1 類別 vs 範疇對照表、IPCC AR5/AR6 GWP 暖化潛勢對照表、碳費三子法重點精華及公式速記卡。

---

## 🚀 靜態網頁本地運行與部屬

### 本地開發啟動
```bash
# 1. 安裝相依套件
npm install

# 2. 啟動 Vite 本地開發伺服器
npm run dev
```
瀏覽器開啟 `http://localhost:3000` 即可立即使用！

---

### 一鍵發布至 GitHub Pages (靜態部屬)

本專案 `vite.config.ts` 已配置 `base: './'` 相對路徑，可直接構建靜態檔案：

```bash
# 1. 構建純靜態網站產物
npm run build
```
產生的 `dist/` 資料夾即為純靜態 HTML/CSS/JS 檔案，可直接上傳至 GitHub 倉庫的 `gh-pages` 分支、或推送到 Vercel、Cloudflare Pages 免費託管！

---

## 💻 方式二：終端 Python CLI 獨立模式

如果您喜歡在終端機命令列下練習，可直接使用 Python 腳本：

```bash
# 1. 安裝 Python 依賴
pip install -r requirements.txt

# 2. 執行互動助教
python ipas_tutor.py
```

---

## 📤 如何將本專案推送到自己的 GitHub 倉庫

```bash
# 1. 初始化本地 Git 儲存庫
git init

# 2. 將所有檔案加入暫存區
git add .

# 3. 提交初始版本 Commit
git commit -m "feat: iPAS Net-Zero Planner static web app"

# 4. 將預設分支命名為 main
git branch -M main

# 5. 連接您的遠端 GitHub 儲存庫
git remote add origin https://github.com/您的帳號/ipas-netzero-planner.git

# 6. 推送至 GitHub
git push -u origin main
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開源。
