import React, { useState, useEffect } from 'react';
import type { FigmaSelectionResult, AIAnalysisResponse, ChromeMessage } from '../types';
import { LANGUAGES } from '../constants';

interface SettingsState {
  deepseekApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  customPrompt: string;
  projectDescription: string;
  aiProvider: 'deepseek' | 'openai' | 'claude';
}

const FigmaAnalyzer: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    deepseekApiKey: '',
    openaiApiKey: '',
    claudeApiKey: '',
    customPrompt: '',
    projectDescription: '',
    aiProvider: 'deepseek'
  });
  const [figmaData, setFigmaData] = useState<FigmaSelectionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'loading' | 'success' | 'error', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'extract' | 'analysis'>('settings');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // 加载保存的设置
  useEffect(() => {
    chrome.storage.sync.get([
      'deepseekApiKey', 
      'openaiApiKey', 
      'claudeApiKey', 
      'customPrompt', 
      'projectDescription', 
      'aiProvider'
    ], (result) => {
      setSettings({
        deepseekApiKey: result.deepseekApiKey || '',
        openaiApiKey: result.openaiApiKey || '',
        claudeApiKey: result.claudeApiKey || '',
        customPrompt: result.customPrompt || '',
        projectDescription: result.projectDescription || '',
        aiProvider: result.aiProvider || 'deepseek'
      });
    });
  }, []);

  // 保存设置
  const saveSettings = () => {
    chrome.storage.sync.set(settings, () => {
      setStatus({type: 'success', message: '设置已保存'});
      setTimeout(() => setStatus(null), 2000);
    });
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

    const apiKey = settings[`${settings.aiProvider}ApiKey` as keyof SettingsState] as string;
    if (!apiKey) {
      setStatus({type: 'error', message: `请先配置${settings.aiProvider.toUpperCase()} API密钥`});
      return;
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
          targetLanguage: targetLanguage
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
              onChange={(e) => setSettings({...settings, aiProvider: e.target.value as 'deepseek' | 'openai' | 'claude'})}
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
            </select>
          </div>

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
                      {analysisResult.analysis.elements.map((element, index) => (
                        <div key={index} style={{marginBottom: '8px', lineHeight: '1.5'}}>
                          {(element.properties as Record<string, unknown>).displayFormat as string}
                        </div>
                      ))}
                    </div>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(
                        analysisResult.analysis.elements.map(element => 
                          (element.properties as Record<string, unknown>).displayFormat as string
                        ).join('\n')
                      )}
                    >
                      复制翻译对照
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="json-output">
                      {JSON.stringify((analysisResult.analysis as unknown as Record<string, unknown>).generatedJson || analysisResult.analysis, null, 2)}
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
};

export default FigmaAnalyzer; 
