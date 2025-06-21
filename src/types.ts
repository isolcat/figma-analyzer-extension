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
export type AIProvider = 'deepseek' | 'openai' | 'claude' | 'ollama';

// 操作类型
export type OperationType = 'analyze' | 'translate' | 'generate-json' | 'translate-and-structure';

// Ollama模型信息类型
export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    family: string;
    format: string;
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

// Ollama模型列表响应类型
export interface OllamaModelsResponse {
  models: OllamaModel[];
}

// AI API请求类型
export interface AIAnalysisRequest {
  prompt?: string;
  figmaData: FigmaSelectionResult;
  pageContext: string;
  projectDescription?: string;
  operation: OperationType;
  aiProvider: AIProvider;
  targetLanguage?: string;
  ollamaModel?: string; // ollama模型名称
}

// AI API响应类型
export interface AIAnalysisResponse {
  analysis: PageAnalysisResult;
  rawResponse: string;
}

// Figma REST API 相关类型
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
  };
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, unknown>;
  componentSets: Record<string, unknown>;
  schemaVersion: number;
  styles: Record<string, unknown>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
}

// Chrome消息类型
export interface ChromeMessage {
  type: 'GET_FIGMA_FILE' | 'ANALYZE_WITH_AI' | 'FIGMA_DATA_RESPONSE' | 'AI_ANALYSIS_RESPONSE' | 'GET_OLLAMA_MODELS' | 'OLLAMA_MODELS_RESPONSE';
  data?: unknown;
  error?: string;
} 
