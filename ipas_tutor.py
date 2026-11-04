#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
iPAS 淨零碳規劃師備考助教 (iPAS Net-Zero Carbon Planner Study Assistant)
=============================================================================
本腳本基於 Google Gemini API (@google/genai) 開發，專為準備經濟部 iPAS「淨零碳規劃師」
能力鑑定證照之考生量身打造。

核心理念：
1. 蘇格拉底式引導：遇考古題不直接給答案，先提供觀念提示引導思考。
2. 盲點診斷與精準引證：解析錯誤原因，精確引用 ISO 14064-1、ISO 14067、
   GHG Protocol 溫室氣體盤查議定書、台灣《氣候變遷因應法》及碳費子法。
3. 支援即時網路查證 (Google Search Grounding)：獲取最新國際標準與法規動態。

安裝依賴：
    pip install -r requirements.txt
    或
    pip install google-genai python-dotenv rich

使用方法：
    1. 設定環境變數 GEMINI_API_KEY (可寫在 .env 檔案中)
    2. 執行：python ipas_tutor.py
=============================================================================
"""

import os
import sys
from dotenv import load_dotenv

# 載入 .env 檔案
load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("\n[錯誤] 尚未安裝 google-genai 套件！")
    print("請先執行：pip install google-genai python-dotenv rich\n")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.text import Text
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None

SYSTEM_INSTRUCTION = """你是一位專業且權威的 iPAS 淨零碳規劃師備考助教（具備 ISO 14064-1/2/3 主導稽核員與碳審計專家背景）。
請協助考生準備經濟部 iPAS 淨零碳規劃師能力鑑定（科目一：淨零碳規劃基礎與法規；科目二：企業溫室氣體盤查與碳足跡實務）。

教學與回答守則：
1. 【引導思考，不直接暴雷】：當學生詢問考古題、選擇題或計算題時，請勿第一時間直接說出答案選項（如「答案是 B」）。請先提供關鍵觀念指引、法規思維方向或解題核心關鍵字，引導學生自行判斷。
2. 【盲點診斷】：當學生回答錯誤或觀念模糊時，請直擊其盲點，解釋為何容易混淆（例如：組織邊界股權比例法 vs 控制權法、類別三運輸間接排放與類別四使用產品之間的分界、範疇二市場基礎法與地點基礎法的差異等）。
3. 【精準標準引證】：每一次解釋與論證，必須明確引用具體國際標準或國內法規條款，例如：
   - ISO 14064-1:2018（組織層級溫室氣體盤查與報告）之原則、類別 1 ~ 類別 6 分類、顯著性間接排放評估準則、基準年重新計算門檻。
   - ISO 14067:2018（產品碳足跡量化與溝通規範）之系統邊界、功能單位 (Functional Unit)、分配規則 (Allocation)。
   - GHG Protocol（企業溫室氣體盤查議定書）Scope 1 / Scope 2 / Scope 3。
   - 台灣《氣候變遷因應法》及環境部碳費徵收辦法（如碳費收費辦法、自主減量計畫等）。
   - 歐盟碳邊境調整機制 (CBAM) 及 SBTi 科學基礎減碳目標。
4. 【語言與語氣】：使用繁體中文（台灣慣用專業詞彙），語氣專業、清晰、富有激勵性，繁簡得宜，格式排版清晰（善用條列與加粗）。"""

def print_banner():
    if HAS_RICH:
        banner = """
   🌱 iPAS 淨零碳規劃師 AI 備考助教 (GitHub Edition) 🌱
   ====================================================
   • 核心標準：ISO 14064-1:2018 | ISO 14067 | GHG Protocol
   • 法規涵蓋：氣候變遷因應法 | 碳費三子法 | 歐盟 CBAM | SBTi
   • 助教模式：啟發引導式提示 (Socratic Tutor)
        """
        console.print(Panel(banner, style="bold green", subtitle="輸入 /help 查看快捷指令 | 輸入 /quit 離開"))
    else:
        print("=" * 60)
        print(" 🌱 iPAS 淨零碳規劃師 AI 備考助教 (GitHub Edition)")
        print("   輸入 /help 查看快捷指令 | 輸入 /quit 離開")
        print("=" * 60)

def print_help():
    help_text = """
【快捷指令清單】
  /hint  <題目內容>    : 要求助教給出這題的核心概念提示（不透漏答案）
  /quiz               : 請助教出一題經典的 iPAS 模擬測驗題
  /calc               : 請助教引導一題溫室氣體排放量計算題
  /search <關鍵字>    : 強制開啟 Google 搜尋聯網查證最新法規
  /help               : 顯示此說明文件
  /quit 或 /exit      : 結束對話
    """
    if HAS_RICH:
        console.print(Panel(help_text.strip(), title="使用說明", style="cyan"))
    else:
        print(help_text)

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("\n[警告] 未偵測到 GEMINI_API_KEY 環境變數！")
        print("請在 .env 檔案中加入：GEMINI_API_KEY=\"你的API金鑰\"")
        print("或在終端機中執行：export GEMINI_API_KEY=\"你的API金鑰\"")
        api_key = input("\n請在此貼上您的 Gemini API Key: ").strip()
        if not api_key:
            print("未提供金鑰，程式結束。")
            return

    client = genai.Client(api_key=api_key)
    # 使用最新穩定版 gemini-3.8-flash
    model_name = "gemini-3.8-flash"

    print_banner()

    chat_history = []

    while True:
        try:
            if HAS_RICH:
                user_input = console.input("\n[bold yellow]考生提問 > [/bold yellow]").strip()
            else:
                user_input = input("\n考生提問 > ").strip()

            if not user_input:
                continue

            if user_input.lower() in ["/quit", "/exit", "exit", "quit", "q"]:
                if HAS_RICH:
                    console.print("[green]祝您備考順利，順利考取 iPAS 淨零碳規劃師證照！再見！[/green]")
                else:
                    print("祝您備考順利，順利考取 iPAS 淨零碳規劃師證照！再見！")
                break

            if user_input.lower() == "/help":
                print_help()
                continue

            use_search = False
            processed_input = user_input

            if user_input.startswith("/search "):
                use_search = True
                query = user_input[8:].strip()
                processed_input = f"【請使用 Google Search 查證最新資訊】考生查詢：{query}"
            elif user_input.startswith("/hint "):
                q = user_input[6:].strip()
                processed_input = f"【題目求助】請不要告訴我答案，請給予這道考題的核心解題觀念、引用的法規標準章節與思考步驟：\n{q}"
            elif user_input.lower() == "/quiz":
                processed_input = "請出一道符合 iPAS 淨零碳規劃師難度的單選模擬題（請涵蓋 ISO 14064-1 或氣候變遷因應法），列出 ABCD 四個選項，但暫時不要公布答案，等待我的回答。"
            elif user_input.lower() == "/calc":
                processed_input = "請出一道 iPAS 常考的溫室氣體活動數據與排放係數計算題（例如冷媒逸散、外購電力或生質燃料熱值計算），並提示計算步驟，讓我試算。"

            # 構建 Content 結構
            chat_history.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=processed_input)]
                )
            )

            # 配置工具與系統提示詞
            tools = []
            if use_search:
                tools.append(types.Tool(googleSearch=types.GoogleSearch()))

            config = types.GenerateContentConfig(
                system_instruction=[types.Part.from_text(text=SYSTEM_INSTRUCTION)],
                tools=tools if tools else None,
            )

            if HAS_RICH:
                console.print("\n[bold green]助教回答中...[/bold green]")
            else:
                print("\n助教回答中...")

            full_reply = ""
            for chunk in client.models.generate_content_stream(
                model=model_name,
                contents=chat_history,
                config=config,
            ):
                if chunk.text:
                    if HAS_RICH:
                        sys.stdout.write(chunk.text)
                        sys.stdout.flush()
                    else:
                        print(chunk.text, end="", flush=True)
                    full_reply += chunk.text

            print() # 換行
            chat_history.append(
                types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=full_reply)]
                )
            )

            # 維持適度的歷史紀錄長度
            if len(chat_history) > 12:
                chat_history = chat_history[-10:]

        except KeyboardInterrupt:
            print("\n已中斷對話。")
            break
        except Exception as e:
            if HAS_RICH:
                console.print(f"\n[bold red][API 錯誤][/bold red] {e}")
            else:
                print(f"\n[API 錯誤] {e}")

if __name__ == "__main__":
    main()
