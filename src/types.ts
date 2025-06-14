// Figma文本信息类型
export interface FigmaTextInfo {
  id: string;
  name: string;
  text: string;
  fontSize: number | string;
  fontFamily: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Figma元素信息类型
export interface FigmaElementInfo {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  textCase?: string;
  textDecoration?: string;
  letterSpacing?: number;
  lineHeight?: unknown;
  children?: FigmaElementInfo[];
}

// Figma选择结果类型
export interface FigmaSelectionResult {
  elements: FigmaElementInfo[];
  texts: FigmaTextInfo[];
  totalTextCount: number;
}

// 页面分析结果类型
export interface PageAnalysisResult {
  pageType: string;
  description: string;
  elements: AnalyzedElement[];
  suggestions: string[];
  timestamp: string;
}

// 分析的元素类型
export interface AnalyzedElement {
  id: string;
  name: string;
  type: string;
  purpose: string;
  properties: Record<string, unknown>;
  recommendations: string[];
}

// AI服务提供商类型
export type AIProvider = 'deepseek' | 'openai' | 'claude';

// 操作类型
export type OperationType = 'analyze' | 'translate' | 'generate-json' | 'translate-and-structure';

// AI API请求类型
export interface AIAnalysisRequest {
  prompt?: string;
  figmaData: FigmaSelectionResult;
  pageContext: string;
  projectDescription?: string;
  operation: OperationType;
  aiProvider: AIProvider;
  targetLanguage?: string;
}

// AI API响应类型
export interface AIAnalysisResponse {
  analysis: PageAnalysisResult;
  rawResponse: string;
}

// Chrome消息类型
export interface ChromeMessage {
  type: 'GET_FIGMA_SELECTION' | 'ANALYZE_WITH_AI' | 'FIGMA_DATA_RESPONSE' | 'AI_ANALYSIS_RESPONSE';
  data?: unknown;
  error?: string;
} 
