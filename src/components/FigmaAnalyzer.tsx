import  { useState, useEffect } from 'react';
import type { FigmaSelectionResult, AIAnalysisResponse, ChromeMessage, OllamaModelsResponse, OllamaModel } from '../types';
import { LANGUAGES } from '../constants';
import JSONPretty from 'react-json-pretty';

interface SettingsState {
  deepseekApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  customPrompt: string;
  projectDescription: string;
  aiProvider: 'deepseek' | 'openai' | 'claude' | 'ollama';
  ollamaModel: string;
}

function FigmaAnalyzer() {
  const [settings, setSettings] = useState<SettingsState>({
    deepseekApiKey: '',
    openaiApiKey: '',
    claudeApiKey: '',
    customPrompt: '',
    projectDescription: '',
    aiProvider: 'deepseek',
    ollamaModel: ''
  });
  const [figmaData, setFigmaData] = useState<FigmaSelectionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'loading' | 'success' | 'error', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'extract' | 'analysis'>('settings');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    chrome.storage.sync.get([
      'deepseekApiKey', 
      'openaiApiKey', 
      'claudeApiKey', 
      'customPrompt', 
      'projectDescription', 
      'aiProvider',
      'ollamaModel'
    ], (result) => {
      setSettings({
        deepseekApiKey: result.deepseekApiKey || '',
        openaiApiKey: result.openaiApiKey || '',
        claudeApiKey: result.claudeApiKey || '',
        customPrompt: result.customPrompt || '',
        projectDescription: result.projectDescription || '',
        aiProvider: result.aiProvider || 'deepseek',
        ollamaModel: result.ollamaModel || ''
      });
    });
  }, []);

  // 当切换到ollama时自动获取模型列表
  useEffect(() => {
    if (settings.aiProvider === 'ollama' && ollamaModels.length === 0) {
      getOllamaModels();
    }
  }, [settings.aiProvider]);

  // 保存设置
  const saveSettings = () => {
    chrome.storage.sync.set(settings, () => {
      setStatus({type: 'success', message: '设置已保存'});
      setTimeout(() => setStatus(null), 2000);
    });
  };

  // 获取Ollama模型列表
  const getOllamaModels = async () => {
    setLoadingModels(true);
    setStatus({type: 'loading', message: '正在获取Ollama模型列表...'});

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_OLLAMA_MODELS'
      } as ChromeMessage);

      if (response.error) {
        throw new Error(response.error);
      }

      const modelsResponse = response.data as OllamaModelsResponse;
      setOllamaModels(modelsResponse.models);
      
      if (modelsResponse.models.length === 0) {
        setStatus({type: 'error', message: '未找到Ollama模型，请先安装模型'});
      } else {
        setStatus({type: 'success', message: `成功获取 ${modelsResponse.models.length} 个Ollama模型`});
        // 如果还没选择模型，自动选择第一个
        if (!settings.ollamaModel && modelsResponse.models.length > 0) {
          setSettings({...settings, ollamaModel: modelsResponse.models[0].name});
        }
      }
    } catch (error) {
      console.error('获取Ollama模型失败:', error);
      setStatus({type: 'error', message: error instanceof Error ? error.message : '获取Ollama模型失败'});
    } finally {
      setLoadingModels(false);
    }
  };

  // 获取Figma选中元素
  const getFigmaSelection = async () => {
    setLoading(true);
    setStatus({type: 'loading', message: '正在获取Figma选中元素...'});

    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const currentTab = tabs[0];

      if (!currentTab.id) {
        throw new Error('无法获取当前标签页');
      }

      if (!currentTab.url?.includes('figma.com')) {
        throw new Error('请在Figma页面中使用此扩展');
      }

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'GET_FIGMA_SELECTION'
      } as ChromeMessage);

      if (response.error) {
        throw new Error(response.error);
      }

      const data = response.data as FigmaSelectionResult;
      setFigmaData(data);
      
      if (data.elements.length === 0 && data.texts.length === 0) {
        setStatus({type: 'error', message: '未检测到选中的Figma元素，请先在Figma中选择一些元素'});
      } else {
        setStatus({type: 'success', message: `成功获取 ${data.elements.length} 个元素，其中包含 ${data.totalTextCount} 个文案`});
        setActiveTab('analysis');
      }
    } catch (error) {
      console.error('获取Figma数据失败:', error);
      setStatus({type: 'error', message: error instanceof Error ? error.message : '获取Figma数据失败'});
    } finally {
      setLoading(false);
    }
  };

  // AI操作
  const performAIOperation = async (operation: 'analyze' | 'translate' | 'translate-and-structure', targetLanguage?: string) => {
    if (!figmaData || (figmaData.elements.length === 0 && figmaData.texts.length === 0)) {
      setStatus({type: 'error', message: '请先获取Figma选中元素'});
      return;
    }

    // Ollama 检查模型选择，其他检查 API 密钥
    if (settings.aiProvider === 'ollama') {
      if (!settings.ollamaModel) {
        setStatus({type: 'error', message: '请先选择Ollama模型'});
        return;
      }
    } else {
      const apiKey = settings[`${settings.aiProvider}ApiKey` as keyof SettingsState] as string;
      if (!apiKey) {
        setStatus({type: 'error', message: `请先配置${settings.aiProvider.toUpperCase()} API密钥`});
        return;
      }
    }

    setLoading(true);
    const operationText = operation === 'translate' ? '翻译' : 
                         operation === 'translate-and-structure' ? '翻译和结构化' : '分析';
    setStatus({type: 'loading', message: `正在进行AI${operationText}...`});

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_WITH_AI',
        data: {
          prompt: settings.customPrompt,
          figmaData: figmaData,
          pageContext: `当前页面URL: ${window.location.href}`,
          projectDescription: settings.projectDescription,
          operation: operation,
          aiProvider: settings.aiProvider,
          targetLanguage: targetLanguage,
          ollamaModel: settings.ollamaModel
        }
      } as ChromeMessage);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data as AIAnalysisResponse;
      setAnalysisResult(result);
      setStatus({type: 'success', message: `AI${operationText}完成`});
    } catch (error) {
      console.error(`AI${operationText}失败:`, error);
      setStatus({type: 'error', message: error instanceof Error ? error.message : `AI${operationText}失败`});
    } finally {
      setLoading(false);
    }
  };

  // 复制JSON结果
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({type: 'success', message: '已复制到剪贴板'});
      setTimeout(() => setStatus(null), 2000);
    });
  };

  return (
    <div className="analyzer-container">
      <div className="header">
        <h1>Figma AI Analyzer</h1>
        <p>智能分析Figma文案并生成结构化JSON</p>
      </div>

      {status && (
        <div className={`status status-${status.type}`}>
          {status.type === 'loading' && <span className="loading-spinner"></span>}
          {status.message}
        </div>
      )}

      {/* 标签页导航 */}
      <div style={{display: 'flex', marginBottom: '20px', borderBottom: '1px solid #e9ecef'}}>
        {(['settings', 'extract', 'analysis'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#2563eb' : 'transparent',
              color: activeTab === tab ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontSize: '12px',
              borderRadius: '4px 4px 0 0'
            }}
          >
            {tab === 'settings' ? '设置' : tab === 'extract' ? '提取' : '分析'}
          </button>
        ))}
      </div>

      {/* 设置标签页 */}
      {activeTab === 'settings' && (
        <div className="section">
          <div className="section-title">AI服务配置</div>
          
          <div className="input-group">
            <label>AI服务提供商</label>
            <select
              value={settings.aiProvider}
              onChange={(e) => setSettings({...settings, aiProvider: e.target.value as 'deepseek' | 'openai' | 'claude' | 'ollama'})}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="ollama">Ollama (本地)</option>
            </select>
          </div>

          {settings.aiProvider !== 'ollama' ? (
            <div className="input-group">
              <label>{settings.aiProvider.toUpperCase()} API密钥</label>
              <input
                type="password"
                value={settings[`${settings.aiProvider}ApiKey` as keyof SettingsState] as string}
                onChange={(e) => setSettings({
                  ...settings,
                  [`${settings.aiProvider}ApiKey`]: e.target.value
                })}
                placeholder={`请输入您的${settings.aiProvider.toUpperCase()} API密钥`}
              />
            </div>
          ) : (
            <div className="input-group">
              <label>Ollama模型选择</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <select
                  value={settings.ollamaModel}
                  onChange={(e) => setSettings({...settings, ollamaModel: e.target.value})}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  disabled={ollamaModels.length === 0}
                >
                  <option value="">请选择模型</option>
                  {ollamaModels.map(model => (
                    <option key={model.name} value={model.name}>
                      {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={getOllamaModels}
                  disabled={loadingModels}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: '#f8f9fa',
                    cursor: loadingModels ? 'not-allowed' : 'pointer',
                    minWidth: '80px'
                  }}
                >
                  {loadingModels ? '加载中...' : '刷新'}
                </button>
              </div>
              <small style={{color: '#6b7280', fontSize: '11px'}}>
                请确保Ollama服务已启动 (http://localhost:11434)
              </small>
            </div>
          )}

          <div className="input-group">
            <label>项目描述 (可选)</label>
            <textarea
              value={settings.projectDescription}
              onChange={(e) => setSettings({...settings, projectDescription: e.target.value})}
              placeholder="描述您的项目背景，以获得更准确的分析结果"
              style={{height: '60px'}}
            />
          </div>

          <div className="input-group">
            <label>自定义提示词 (可选)</label>
            <textarea
              value={settings.customPrompt}
              onChange={(e) => setSettings({...settings, customPrompt: e.target.value})}
              placeholder="留空使用默认提示词"
            />
          </div>

          <button className="button button-secondary" onClick={saveSettings}>
            保存设置
          </button>
        </div>
      )}

      {/* 提取标签页 */}
      {activeTab === 'extract' && (
        <div className="section">
          <div className="section-title">文案提取</div>
          
          <button 
            className="button button-primary" 
            onClick={getFigmaSelection}
            disabled={loading}
          >
            获取Figma选中元素
          </button>

          {figmaData && (figmaData.elements.length > 0 || figmaData.texts.length > 0) && (
            <div className="figma-data">
              <h4>提取结果 ({figmaData.elements.length}个元素，{figmaData.totalTextCount}个文案)</h4>
              
              {figmaData.texts.length > 0 && (
                <div style={{marginBottom: '15px'}}>
                  <h5 style={{fontSize: '12px', color: '#475569', marginBottom: '8px'}}>文案内容:</h5>
                  {figmaData.texts.slice(0, 5).map((text) => (
                    <div key={text.id} className="figma-element">
                      <div className="figma-element-header">
                        {text.name}
                      </div>
                      <div className="figma-element-details">
                        文案: "{text.text}"<br/>
                        字体: {text.fontFamily} {text.fontSize}px
                      </div>
                    </div>
                  ))}
                  {figmaData.texts.length > 5 && (
                    <div className="figma-element-details">
                      还有 {figmaData.texts.length - 5} 个文案...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 分析标签页 */}
      {activeTab === 'analysis' && figmaData && (
        <div className="section">
          <div className="section-title">AI分析与处理</div>
          
          <div style={{display: 'grid', gap: '10px', marginBottom: '15px'}}>
            <button 
              className="button button-primary" 
              onClick={() => performAIOperation('analyze')}
              disabled={loading}
            >
              生成结构化JSON
            </button>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <label style={{fontSize: '12px', minWidth: '60px'}}>翻译为:</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <button 
                  className="button button-secondary" 
                  onClick={() => performAIOperation('translate', selectedLanguage)}
                  disabled={loading}
                >
                  纯翻译
                </button>
                <button 
                  className="button button-secondary" 
                  onClick={() => performAIOperation('translate-and-structure', selectedLanguage)}
                  disabled={loading}
                >
                  翻译+结构化
                </button>
              </div>
            </div>
          </div>

          {analysisResult && (
            <div className="analysis-result">
              <h3>处理结果</h3>
              
              <div className="analysis-section">
                <h4>类型</h4>
                <p>{analysisResult.analysis.pageType}</p>
              </div>

              <div className="analysis-section">
                <h4>描述</h4>
                <p>{analysisResult.analysis.description}</p>
              </div>

              {analysisResult.analysis.suggestions && analysisResult.analysis.suggestions.length > 0 && (
                <div className="analysis-section">
                  <h4>建议</h4>
                  <ul>
                    {analysisResult.analysis.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="analysis-section">
                <h4>
                  {analysisResult.analysis.pageType === '翻译对照' ? '翻译对照结果' : 'JSON结果'}
                </h4>
                
                {analysisResult.analysis.pageType === '翻译对照' ? (
                  <div>
                    <div className="translation-pairs" style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '10px',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}>
                      {analysisResult.analysis.elements.map((element, index) => {
                        const props = element.properties as Record<string, unknown>;
                        const original = props.original as string;
                        const translated = props.translated as string;
                        
                        return (
                          <div key={index} style={{
                            marginBottom: '8px', 
                            lineHeight: '1.5',
                            padding: '6px 8px',
                            backgroundColor: '#ffffff',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <span style={{
                              color: '#1e40af',
                              fontWeight: '500'
                            }}>
                              {original}
                            </span>
                            <span style={{
                              color: '#6b7280',
                              margin: '0 6px'
                            }}>
                              ：
                            </span>
                            <span style={{
                              color: '#dc2626',
                              fontWeight: '500'
                            }}>
                              {translated}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button 
                        className="copy-button"
                        onClick={() => copyToClipboard(
                          analysisResult.analysis.elements.map(element => {
                            const props = element.properties as Record<string, unknown>;
                            return `${props.original as string}：${props.translated as string}`;
                          }).join('\n')
                        )}
                        style={{flex: 1}}
                      >
                        复制翻译对照
                      </button>
                      <button 
                        className="copy-button"
                        onClick={() => copyToClipboard(
                          analysisResult.analysis.elements.map(element => 
                            (element.properties as Record<string, unknown>).translated as string
                          ).join('\n')
                        )}
                        style={{flex: 1, backgroundColor: '#dc2626'}}
                      >
                        仅复制译文
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="json-pretty-container" style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '10px',
                      fontSize: '13px',
                      overflow: 'auto',
                      maxHeight: '400px'
                    }}>
                      <JSONPretty 
                        id="json-pretty" 
                        data={(analysisResult.analysis as unknown as Record<string, unknown>).generatedJson || analysisResult.analysis}
                        theme={{
                          main: 'line-height:1.3;color:#444;background:#f8f9fa;overflow:auto;',
                          error: 'line-height:1.3;color:#66d9ef;background:#f8f9fa;overflow:auto;',
                          key: 'color:#2563eb;font-weight:600;',
                          string: 'color:#059669;',
                          value: 'color:#7c3aed;',
                          boolean: 'color:#dc2626;',
                          number: 'color:#ea580c;',
                          null: 'color:#6b7280;',
                          undefined: 'color:#6b7280;'
                        }}
                        space={2}
                        replacer={(_key, value) => {
                          // 美化超长文本显示
                          if (typeof value === 'string' && value.length > 80) {
                            return value.substring(0, 80) + '...';
                          }
                          return value;
                        }}
                      />
                    </div>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(JSON.stringify((analysisResult.analysis as unknown as Record<string, unknown>).generatedJson || analysisResult.analysis, null, 2))}
                    >
                      复制JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FigmaAnalyzer; 
