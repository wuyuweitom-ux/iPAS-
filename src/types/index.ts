export type RagDocCategory = '公版教材' | '歷年考古題' | '法規標準' | '自訂講義';

export interface RagCitation {
  chunkId?: string;
  docName: string;
  category: RagDocCategory;
  pageOrSection: string;
  snippet: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  groundingUrls?: Array<{ uri: string; title?: string }>;
  ragCitations?: RagCitation[];
  sourceMode?: 'rag' | 'rag+web' | 'web' | 'offline';
  isHint?: boolean;
}

export type TutorMode = 'socratic' | 'diagnostic' | 'standards' | 'calculation';

export interface ExamQuestion {
  id: string;
  subject: '科目一' | '科目二';
  subjectTitle: string;
  topic: string;
  question: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  standardCitation: string;
  hint: string;
  difficulty: '基礎' | '中等' | '進階';
}

export interface StudyNote {
  id: string;
  title: string;
  category: string;
  standard: string;
  summary: string;
  keyPoints: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
  examTrapNotice?: string;
}

export interface RagChunk {
  id: string;
  docId: string;
  docName: string;
  category: RagDocCategory;
  pageOrSection: string;
  content: string;
}

export interface RagDocument {
  id: string;
  name: string;
  category: RagDocCategory;
  createdAt: string;
  chunkCount: number;
  charCount: number;
  isBuiltIn?: boolean;
}

export interface RagSearchResult {
  chunk: RagChunk;
  score: number;
  matchedTerms: string[];
}
