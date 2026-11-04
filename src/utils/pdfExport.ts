/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * iPAS 備考筆記 PDF 導出工具 (基於 html2canvas + jsPDF)
 * 高解析度、完整支援繁體中文排版、自動分頁處理
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ChatMessage } from '../types';

export async function exportNotesToPdf(
  messages: ChatMessage[],
  onProgress?: (status: string) => void
): Promise<void> {
  if (!messages || messages.length === 0) {
    alert('目前尚無對話筆記可供匯出！');
    return;
  }

  onProgress?.('正在排版備考筆記內容...');

  // 建立離線渲染容器 (A4 標準寬度 794px @ 96DPI)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  container.style.padding = '36px 42px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-1000';

  const dateStr = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = new Date().toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // 構建精美 A4 筆記 HTML 範本
  container.innerHTML = `
    <div style="border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid #a7f3d0; margin-bottom: 6px;">
            經濟部 iPAS 淨零碳規劃師能力鑑定
          </span>
          <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.5px;">
            🌿 iPAS 淨零碳規劃師 智能備考解析筆記
          </h1>
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            涵蓋：ISO 14064-1:2018 溫室氣體盤查 • ISO 14067 產品碳足跡 • 台灣氣候變遷因應法與碳費子法
          </p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          <div><strong>匯出日期：</strong>${dateStr}</div>
          <div><strong>匯出時間：</strong>${timeStr}</div>
          <div style="margin-top: 4px; color: #059669; font-weight: 600;">共 ${messages.length} 則學習紀錄</div>
        </div>
      </div>
    </div>

    <!-- 對話內容條列 -->
    <div style="display: flex; flex-direction: column; gap: 18px;">
      ${messages
        .map((m, idx) => {
          const isUser = m.role === 'user';
          // 簡易處理 Markdown 格式
          const formattedText = m.content
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #047857;">$1</strong>')
            .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 12px; font-family: monospace; color: #0f766e;">$1</code>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n- /g, '<br/>• ');

          if (isUser) {
            return `
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 12px 16px; margin-top: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
                  <span>👤 考生提問 / 考古題諮詢</span>
                  <span style="font-size: 11px; font-weight: 400; color: #64748b;">${m.timestamp || ''}</span>
                </div>
                <div style="font-size: 13px; line-height: 1.6; color: #334155;">
                  ${formattedText}
                </div>
              </div>
            `;
          } else {
            return `
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 8px;">
                  <span>🌿 iPAS AI 助教解題思路與法規引證</span>
                  <span style="font-size: 11px; font-weight: 400; color: #64748b;">${m.timestamp || ''}</span>
                </div>
                <div style="font-size: 13px; line-height: 1.7; color: #1e293b;">
                  ${formattedText}
                </div>
              </div>
            `;
          }
        })
        .join('')}
    </div>

    <!-- 頁尾水印與聲明 -->
    <div style="border-top: 1px solid #cbd5e1; margin-top: 36px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
      <span>本筆記由《iPAS 淨零碳規劃師備考系統》自動整理產出 • 僅供個人備考研習之用</span>
      <span>規範標準引證：ISO 14064-1:2018 / ISO 14067:2018 / 氣候變遷因應法</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    onProgress?.('正在將筆記轉製為高畫質 PDF...');

    // 使用 html2canvas 將渲染內容轉換為高畫質 Canvas (scale: 2 確保文字超清晰)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    onProgress?.('正在計算分頁與組裝檔案...');

    const imgWidth = 210; // A4 寬度 (mm)
    const pageHeight = 297; // A4 高度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // 將 Canvas 內容轉為 JPEG 格式插入 PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 第一頁
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 若內容超過一頁，自動進行多頁切分
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeDate = new Date().toISOString().slice(0, 10);
    pdf.save(`iPAS-淨零碳規劃師-備考解析筆記-${safeDate}.pdf`);

    onProgress?.('匯出完成！');
  } catch (err) {
    console.error('PDF export failed:', err);
    throw new Error('PDF 檔案轉換失敗，請稍後重試。');
  } finally {
    document.body.removeChild(container);
  }
}
