export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  groundingUrls?: Array<{ uri: string; title?: string }>;
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
