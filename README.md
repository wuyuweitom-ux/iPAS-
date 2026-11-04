# 🌿 iPAS 淨零碳規劃師 AI 備考助教 (iPAS Net-Zero Carbon Planner Copilot)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Gemini API](https://img.shields.io/badge/Google%20GenAI-Gemini%20API-orange.svg)](https://aistudio.google.com/)
[![iPAS Certified](https://img.shields.io/badge/iPAS-經濟部淨零碳規劃師-teal.svg)](https://www.ipas.org.tw/)

專為準備經濟部 **iPAS「淨零碳規劃師」能力鑑定考試** 考生設計的開源智慧備考助教與全端練習系統。具備蘇格拉底式引導提示、ISO 14064-1/ISO 14067/GHG Protocol 國際標準精準引證、考題盲點診斷、精選試題模擬庫與雙模式（全端網頁 / 終端 Python CLI）執行支援。

---

## 🌟 核心特色 (Key Features)

1. **💡 蘇格拉底式啟發引導（不直接暴雷）**
   - 遇選擇題或考古題提問時，助教不直接提供 ABCD 選項答案，而是先梳理考點架構、法規關鍵字與判斷邏輯，刺激自主思考。
2. **🎯 盲點精準診斷與國際標準引證**
   - 答錯或觀念混淆時，直接指出思維盲區（如「組織邊界股權比例 vs 營運控制」、「範疇二市場基礎法 vs 地點基礎法」、「類別三上游運輸 vs 類別四採購商品」）。
   - 精確引用：
     - **ISO 14064-1:2018**（組織溫室氣體盤查與報告）
     - **ISO 14067:2018**（產品碳足跡量化標準與 LCA）
     - **GHG Protocol**（溫室氣體盤查議定書 Scope 1~3）
     - **台灣《氣候變遷因應法》** 與環境部碳費徵收三子法
     - **歐盟碳邊境調整機制 (CBAM)** 及 **SBTi** 科學基礎目標
3. **📚 雙端執行架構 (Dual-Architecture)**
   - **現代化 Web 應用程式**：React 19 + TypeScript + Tailwind CSS + Express 串流服務，內建模擬測驗庫與法規速查手冊。
   - **輕量 Python CLI 終端工具 (`ipas_tutor.py`)**：適合終端機愛好者快速刷題與觀念即時問答。
4. **🔍 Google Search 聯網實時查證**
   - 整合 Gemini API 搜尋接地功能 (Search Grounding)，隨時取得最新公告之碳費費率與國際法規時程。

---

## 📂 專案結構 (Repository Structure)

```bash
ipas-netzero-planner/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI 自動化型別與語法檢查
├── public/                      # 靜態資源檔案
├── src/                         # 前端 React 應用程式原始碼
│   ├── components/              # 助教對話、考題模擬庫、法規速查、專案導出模組
│   ├── data/                    # iPAS 精選高頻考題庫 (40+題) 與標準速查資料
│   ├── types/                   # TypeScript 型別定義
│   ├── App.tsx                  # 主應用程式介面
│   └── main.tsx                 # 前端入口
├── ipas_tutor.py                # 終端 Python 互動助教腳本 (CLI)
├── server.ts                    # Node.js Express + Gemini API 安全代理伺服器
├── requirements.txt             # Python 依賴套件清單
├── package.json                 # Node.js 專案設定與相依套件
├── tsconfig.json                # TypeScript 編譯配置
├── vite.config.ts               # Vite 打包配置
├── .env.example                 # 環境變數設定範例檔
├── .gitignore                   # Git 忽略檔案規則
├── LICENSE                      # MIT 開源授權協議
└── README.md                    # 專案完整中文使用說明
```

---

## 🚀 快速開始 (Quick Start)

### 步驟 0：取得 Google Gemini API Key

請至 [Google AI Studio](https://aistudio.google.com/) 點擊 **Get API key**，免費建立一組專屬 API 金鑰。

---

### 方式一：啟動現代化 Web 網頁應用 (推薦)

#### 1. 安裝 Node.js 依賴套件
```bash
npm install
```

#### 2. 設定環境變數
複製 `.env.example` 為 `.env` 並填入你的 Gemini API Key：
```bash
cp .env.example .env
```
在 `.env` 中設定：
```env
GEMINI_API_KEY="你的_GEMINI_API_KEY"
PORT=3000
```

#### 3. 啟動全端開發伺服器
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:3000` 即可體驗包含「AI 智慧助教」、「精選題庫模擬測驗」與「標準速查圖譜」的完整介面！

---

### 方式二：終端 Python CLI 獨立模式

如果您喜歡在終端機命令列下練習，可直接使用 Python 腳本：

#### 1. 建立虛擬環境並安裝依賴
```bash
python -m venv venv
source venv/bin/activate  # Windows 請執行: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. 設置環境變數
```bash
export GEMINI_API_KEY="你的_GEMINI_API_KEY"  # Windows PowerShell: $env:GEMINI_API_KEY="你的金鑰"
```

#### 3. 執行互動助教
```bash
python ipas_tutor.py
```

#### 終端快捷指令：
- `/hint <題目>`：要求助教給予解題提示（不透露答案）
- `/quiz`：隨機產生一題 iPAS 選擇題模擬
- `/calc`：產生一題排放量或碳足跡計算練習
- `/search <關鍵字>`：透過 Google Search 查證最新官方標準
- `/help`：顯示功能選單
- `/quit`：結束程式

---

## 📤 如何將本專案上傳到自己的 GitHub (GitHub Push Guide)

若您是第一次將此專案推送至個人 GitHub，請依照以下步驟：

```bash
# 1. 初始化本地 Git 儲存庫
git init

# 2. 將所有檔案加入暫存區
git add .

# 3. 提交初始版本
git commit -m "feat: initial commit of iPAS Net-Zero Carbon Planner Copilot"

# 4. 將預設分支切換為 main
git branch -M main

# 5. 連接您的 GitHub 遠端儲存庫 (請將 USERNAME 與 REPO 替換為您的倉庫名稱)
git remote add origin https://github.com/USERNAME/ipas-netzero-planner.git

# 6. 推送至 GitHub
git push -u origin main
```

> **安全提示**：本專案 `.gitignore` 已預先排除 `.env`，請確保不要將含有私人金鑰的 `.env` 推送至公開儲存庫。

---

## 📖 iPAS 考試範圍與本專案覆蓋對照

| 科目名稱 | 核心考點 | 本專案支援模組 |
| :--- | :--- | :--- |
| **科目一：淨零碳規劃基礎與法規** | 氣候變遷公約 (UNFCCC、COP28)、巴黎協定、台灣氣候變遷因應法、碳費收費機制、歐盟 CBAM、SBTi 淨零標準 | 模擬題庫、法規速查表、AI 即時法規諮詢 |
| **科目二：企業溫室氣體盤查與碳足跡實務** | ISO 14064-1:2018（類別 1~6）、組織邊界判定、顯著性間接排放評估、基準年修正、活動數據量化、GWP 係數、ISO 14067 碳足跡與生命週期評估 (LCA) | 計算題引導、錯誤盲點剖析、考題實戰測驗 |

---

## 🤝 參與貢獻 (Contributing)

歡迎提交 PR 或提出 Issue！
1. Fork 本儲存庫
2. 建立新功能分支 (`git checkout -b feature/NewFeature`)
3. 提交變更 (`git commit -m 'feat: Add New Feature'`)
4. 推送至分支 (`git push origin feature/NewFeature`)
5. 發起 Pull Request

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開源。
