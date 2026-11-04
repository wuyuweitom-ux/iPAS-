/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 數學計算式、LaTeX 符號、化學分子式 (CO₂, CH₄, N₂O, SF₆, NF₃ 等) 與 Markdown 渲染工具
 * 支援：
 * - 區塊公式 $$ ... $$ 與 \[ ... \]
 * - 行內公式 $ ... $ 與 \( ... \)
 * - LaTeX 指令：\text{}, \mathrm{}, \frac{}{}, \sqrt{}, \times, \div, \approx, \le, \ge, \sum, \Delta 等
 * - 上標 ^{...} / ^2 與下標 _{...} / _2
 * - 溫室氣體化學式自動美化：CO2 -> CO₂, tCO2e -> tCO₂e, CH4 -> CH₄, N2O -> N₂O, SF6 -> SF₆, NF3 -> NF₃
 */

/**
 * 將單一 LaTeX 數學字串轉換為乾淨的 HTML 結構 (不含外層 $ 符號)
 */
export function convertLatexToHtml(latex: string, isLightMode = false): string {
  let s = latex.trim();

  // 1. 處理 \text{...}, \mathrm{...}, \textbf{...}, \mathbf{...}, \mathit{...}
  // 使用迴圈處理可能的多個或巢狀指令
  for (let i = 0; i < 5; i++) {
    s = s.replace(/\\(?:text|mathrm|textrm|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\(?:textbf|mathbf|boldsymbol)\s*\{([^{}]*)\}/g, '<strong>$1</strong>');
  }

  // 2. 處理分數 \frac{a}{b} 或 \dfrac{a}{b}
  for (let i = 0; i < 3; i++) {
    s = s.replace(
      /\\(?:d?frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_match, num, den) =>
        `<span style="display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 4px; font-size: 0.9em; line-height: 1.15;">` +
        `<span style="border-bottom: 1px solid currentColor; padding: 0 4px;">${num}</span>` +
        `<span style="padding: 0 4px;">${den}</span>` +
        `</span>`
    );
  }

  // 3. 處理根號 \sqrt{x}
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');

  // 4. 處理括號修飾與空白控制
  s = s
    .replace(/\\left\s*([([\]{}|.])/g, '$1')
    .replace(/\\right\s*([([\]{}|.])/g, '$1')
    .replace(/\\(?:quad|qquad)/g, '&nbsp;&nbsp;')
    .replace(/\\[,;:!]/g, '&nbsp;')
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_');

  // 5. 常用數學運算符號與希臘字母替換
  const symbolMap: Array<[RegExp, string]> = [
    [/\\times\b/g, ' × '],
    [/\\div\b/g, ' ÷ '],
    [/\\cdot\b/g, ' · '],
    [/\\pm\b/g, ' ± '],
    [/\\mp\b/g, ' ∓ '],
    [/\\approx\b/g, ' ≈ '],
    [/\\sim\b/g, ' ~ '],
    [/\\(?:neq|ne)\b/g, ' ≠ '],
    [/\\(?:leq|le)\b/g, ' ≤ '],
    [/\\(?:geq|ge)\b/g, ' ≥ '],
    [/\\(?:rightarrow|to)\b/g, ' → '],
    [/\\leftarrow\b/g, ' ← '],
    [/\\Rightarrow\b/g, ' ⇒ '],
    [/\\leftrightarrow\b/g, ' ↔ '],
    [/\\sum\b/g, '∑'],
    [/\\prod\b/g, '∏'],
    [/\\Delta\b/g, 'Δ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\delta\b/g, 'δ'],
    [/\\epsilon\b/g, 'ε'],
    [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'],
    [/\\mu\b/g, 'μ'],
    [/\\pi\b/g, 'π'],
    [/\\rho\b/g, 'ρ'],
    [/\\sigma\b/g, 'σ'],
    [/\\tau\b/g, 'τ'],
    [/\\omega\b/g, 'ω'],
    [/\\Omega\b/g, 'Ω'],
    [/\\infty\b/g, '∞'],
    [/\\circ\b/g, '°'],
  ];

  for (const [regex, replacement] of symbolMap) {
    s = s.replace(regex, replacement);
  }

  // 6. 處理下標 _{...} 與 _x
  s = s.replace(/_\{([^{}]+)\}/g, '<sub style="font-size: 0.78em; vertical-align: sub;">$1</sub>');
  s = s.replace(/_([0-9a-zA-Z+-])/g, '<sub style="font-size: 0.78em; vertical-align: sub;">$1</sub>');

  // 7. 處理上標 ^{...} 與 ^x
  s = s.replace(/\^\{([^{}]+)\}/g, '<sup style="font-size: 0.78em; vertical-align: super;">$1</sup>');
  s = s.replace(/\^([0-9a-zA-Z+-°]+)/g, '<sup style="font-size: 0.78em; vertical-align: super;">$1</sup>');

  // 8. 清除殘留的雙大括號或單大括號（排除 HTML 標籤）
  s = s.replace(/\{([^{}<>]*)\}/g, '$1');

  // 9. 清理多餘空白
  s = s.replace(/\s{2,}/g, ' ').trim();

  const badgeStyle = isLightMode
    ? 'font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif; color: #065f46; font-weight: 600;'
    : 'font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif; color: #6ee7b7; font-weight: 600;';

  return `<span style="${badgeStyle}">${s}</span>`;
}

/**
 * 將內文中的行內公式 ($...$)、裸露 LaTeX 指令、化學式與 Markdown 行內語法轉為 HTML
 */
export function formatInlineRichText(text: string, isLightMode = false): string {
  if (!text) return '';

  let result = text;

  // 1. 先處理行內數學公式 $...$ (不跨行) 與 \( ... \)
  result = result.replace(/\\\((.+?)\\\)/g, (_m, inner) => convertLatexToHtml(inner, isLightMode));
  result = result.replace(/\$([^$\n]+?)\$/g, (_m, inner) => convertLatexToHtml(inner, isLightMode));

  // 2. 若 AI 未加 $ 符號而直接輸出裸露的 \text{CO}_2 或 \times 等，一併捕捉處理
  if (result.includes('\\text') || result.includes('\\mathrm') || result.includes('\\times') || result.includes('\\frac')) {
    result = result.replace(
      /\\(?:text|mathrm)\{([^{}]+)\}(?:_\{([^{}]+)\}|_([0-9a-zA-Z]))?(?:\\(?:text|mathrm)\{([^{}]+)\})?/g,
      (fullMatch) => convertLatexToHtml(fullMatch, isLightMode)
    );
    result = result
      .replace(/\\times\b/g, ' × ')
      .replace(/\\div\b/g, ' ÷ ')
      .replace(/\\approx\b/g, ' ≈ ')
      .replace(/\\(?:leq|le)\b/g, ' ≤ ')
      .replace(/\\(?:geq|ge)\b/g, ' ≥ ')
      .replace(/\\rightarrow\b/g, ' → ');
  }

  // 3. 處理裸露的常見溫室氣體化學分子式下標 (例如 CO2, CO2e, tCO2e, kgCO2e, CH4, N2O, SF6, NF3, CF4, C2F6, SO2, H2O)
  // 避免替換已經在 <sub> 內的文字
  result = result
    .replace(/\b(kt|Mt|gt|t|kg|g)?CO2(e)?\b/g, '$1CO<sub style="font-size: 0.78em;">2</sub>$2')
    .replace(/\bCH4\b/g, 'CH<sub style="font-size: 0.78em;">4</sub>')
    .replace(/\bN2O\b/g, 'N<sub style="font-size: 0.78em;">2</sub>O')
    .replace(/\bSF6\b/g, 'SF<sub style="font-size: 0.78em;">6</sub>')
    .replace(/\bNF3\b/g, 'NF<sub style="font-size: 0.78em;">3</sub>')
    .replace(/\bCF4\b/g, 'CF<sub style="font-size: 0.78em;">4</sub>')
    .replace(/\bC2F6\b/g, 'C<sub style="font-size: 0.78em;">2</sub>F<sub style="font-size: 0.78em;">6</sub>')
    .replace(/\bH2O\b/g, 'H<sub style="font-size: 0.78em;">2</sub>O')
    .replace(/\bSO2\b/g, 'SO<sub style="font-size: 0.78em;">2</sub>')
    .replace(/\bO2\b/g, 'O<sub style="font-size: 0.78em;">2</sub>');

  // 4. 處理 Markdown 粗體 **...**
  const strongColor = isLightMode ? '#047857' : '#6ee7b7';
  result = result.replace(
    /\*\*(.+?)\*\*/g,
    `<strong style="color: ${strongColor}; font-weight: 600;">$1</strong>`
  );

  // 5. 處理行內程式碼 `...`
  const codeStyle = isLightMode
    ? 'background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.88em; font-family: monospace; color: #0f766e;'
    : 'background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-family: monospace; color: #5eead4;';
  result = result.replace(/`([^`]+)`/g, `<code style="${codeStyle}">$1</code>`);

  return result;
}

/**
 * 將區塊數學公式 $$ ... $$ 先轉換為獨立段落標記，方便後續整體渲染
 */
export function normalizeBlockMath(content: string): string {
  if (!content) return '';
  // 將跨行或單行的 $$ ... $$ 及 \[ ... \] 獨立成段落
  return content
    .replace(/\\\[([\s\S]+?)\\\]/g, '\n\n$$$$\n$1\n$$$$\n\n')
    .replace(/\$\$([\s\S]+?)\$\$/g, '\n\n$$$$\n$1\n$$$$\n\n');
}

/**
 * 將語音朗讀 (TTS) 用的文字清理乾淨，讓朗讀自然唸出「二氧化碳」、「乘以」而非唸出 LaTeX 語法
 */
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\bCO_?2e\b/gi, '二氧化碳當量')
    .replace(/\bCO_?2\b/gi, '二氧化碳')
    .replace(/\bCH_?4\b/gi, '甲烷')
    .replace(/\bN_?2O\b/gi, '氧化亞氮')
    .replace(/\bSF_?6\b/gi, '六氟化硫')
    .replace(/\bNF_?3\b/gi, '三氟化氮')
    .replace(/\\times/g, '乘以')
    .replace(/\\div/g, '除以')
    .replace(/\\approx/g, '約等於')
    .replace(/[$*#`_>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
