import type { ChromeMessage, AIAnalysisRequest, AIAnalysisResponse, PageAnalysisResult, AIProvider, OllamaModelsResponse } from './types';
import { ANALYSIS_PROMPT_TEMPLATE, TRANSLATION_PROMPT_TEMPLATE, TRANSLATE_AND_STRUCTURE_PROMPT_TEMPLATE } from './prompts';

// 调用不同的AI服务
async function callAIService(request: AIAnalysisRequest): Promise<string> {
  console.log('🔍 接收到AI请求:', request);
  
  const result = await chrome.storage.sync.get(['deepseekApiKey', 'openaiApiKey', 'claudeApiKey', 'ollamaModel']);
  
  const apiKeys: Record<AIProvider, string> = {
    deepseek: result.deepseekApiKey,
    openai: result.openaiApiKey,
    claude: result.claudeApiKey,
    ollama: '' // ollama 不需要 API 密钥
  };

  // ollama 需要检查模型而不是 API 密钥
  if (request.aiProvider === 'ollama') {
    if (!request.ollamaModel) {
      throw new Error('请先选择 Ollama 模型');
    }
  } else {
    const apiKey = apiKeys[request.aiProvider];
    if (!apiKey) {
      throw new Error(`请先配置${request.aiProvider.toUpperCase()} API密钥`);
    }
  }

  let prompt: string;
  
  console.log('📊 请求数据分析:');
  console.log('  操作类型:', request.operation);
  console.log('  AI提供商:', request.aiProvider);
  console.log('  figmaData:', request.figmaData);
  console.log('  文案数量:', request.figmaData?.texts?.length);
  console.log('  项目描述:', request.projectDescription);
  
  if (request.operation === 'translate') {
    const textsToTranslate = request.figmaData.texts.map(t => t.text).join('\n');
    const targetLanguage = getLanguageName(request.targetLanguage || 'en');
    const additionalInstruction = `\n\n**最终提醒**：以上共 ${request.figmaData.texts.length} 行英文文案，每行输出格式必须是：英文原文：${targetLanguage}译文`;
    
    prompt = TRANSLATION_PROMPT_TEMPLATE
      .replace(/\{targetLanguage\}/g, targetLanguage)  // 全局替换所有占位符
      .replace('{textsToTranslate}', textsToTranslate) + additionalInstruction;
  } else if (request.operation === 'translate-and-structure') {
    // 检查是否有文案数据
    if (!request.figmaData || !request.figmaData.texts || request.figmaData.texts.length === 0) {
      console.error('❌ 没有找到文案数据!');
      throw new Error('没有找到文案数据，请先提取Figma文案');
    }
    
    // 格式化文案数据
    const allTextsFormatted = request.figmaData.texts.map((text, index) => 
      `${index + 1}. "${text.text}"`
    ).join('\n');
    
    const projectDesc = request.projectDescription || '网页界面设计项目';
    const targetLanguage = getLanguageName(request.targetLanguage || 'en');
    
    // 添加额外的严格要求提醒
    const strictReminder = `\n\n**再次强调**：请确保JSON中只包含上述 ${request.figmaData.totalTextCount} 条提取文案的翻译版本，不要添加任何额外内容！`;
    
    prompt = TRANSLATE_AND_STRUCTURE_PROMPT_TEMPLATE
      .replace(/\{targetLanguage\}/g, targetLanguage)
      .replace('{textCount}', request.figmaData.totalTextCount.toString())
      .replace('{allTexts}', allTextsFormatted)
      .replace('{projectDescription}', projectDesc) + strictReminder;
  } else {
    // 检查是否有文案数据
    if (!request.figmaData || !request.figmaData.texts || request.figmaData.texts.length === 0) {
      console.error('❌ 没有找到文案数据!');
      throw new Error('没有找到文案数据，请先提取Figma文案');
    }
    
    // 格式化文案数据 - 翻译时直接使用原文，不添加序号
    const allTextsFormatted = request.figmaData.texts.map(text => text.text).join('\n');
    
    console.log('📝 格式化的文案:', allTextsFormatted);
    
    const projectDesc = request.projectDescription || '网页界面设计项目';
    
    // 添加额外的严格要求提醒
    const strictReminder = `\n\n**再次强调**：请确保JSON中只包含上述 ${request.figmaData.totalTextCount} 条提取的文案，不要添加任何额外内容！`;
    
    prompt = ANALYSIS_PROMPT_TEMPLATE
      .replace('{textCount}', request.figmaData.totalTextCount.toString())
      .replace('{allTexts}', allTextsFormatted)
      .replace('{projectDescription}', projectDesc) + strictReminder;
  }

  console.log('📤 完整的prompt:');
  console.log(prompt);
  console.log('------------------------');

  switch (request.aiProvider) {
    case 'deepseek':
      return await callDeepSeekAPI(prompt, apiKeys.deepseek);
    case 'openai':
      return await callOpenAIAPI(prompt, apiKeys.openai);
    case 'claude':
      return await callClaudeAPI(prompt, apiKeys.claude);
    case 'ollama':
      return await callOllamaAPI(prompt, request.ollamaModel!);
    default:
      throw new Error('不支持的AI服务');
  }
}

// DeepSeek API调用 - 使用与Figma插件相同的参数
async function callDeepSeekAPI(prompt: string, apiKey: string): Promise<string> {
  const requestBody = {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,  // 降低温度提高一致性
    max_tokens: 2000
  };
  
  console.log('🚀 发送到DeepSeek的请求体:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API Error:', errorText);
    throw new Error(`DeepSeek API错误: ${response.status}`);
  }

  const data = await response.json();
  console.log('📥 DeepSeek API完整响应:', JSON.stringify(data, null, 2));
  
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('DeepSeek API返回空内容');
  }
  
  console.log('✅ DeepSeek API返回内容:', content);
  return content;
}

// OpenAI API调用
async function callOpenAIAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API Error:', errorText);
    throw new Error(`OpenAI API错误: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API返回空内容');
  }
  
  return content;
}

// Claude API调用
async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API Error:', errorText);
    throw new Error(`Claude API错误: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  
  if (!content) {
    throw new Error('Claude API返回空内容');
  }
  
  return content;
}

// Ollama API调用
async function callOllamaAPI(prompt: string, modelName: string): Promise<string> {
  const requestBody = {
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    stream: false, // 禁用流式输出，直接获取完整响应
    think: false   // 禁用思考模式，直接返回结果
  };
  
  console.log('🚀 发送到Ollama的请求体:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API Error:', errorText);
    if (response.status === 0 || !response.status) {
      throw new Error('无法连接到Ollama服务，请确保Ollama正在运行 (http://localhost:11434)');
    }
    throw new Error(`Ollama API错误: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('📥 Ollama API完整响应:', JSON.stringify(data, null, 2));
  
  const content = data.message?.content;
  
  if (!content) {
    throw new Error('Ollama API返回空内容');
  }
  
  console.log('✅ Ollama API返回内容:', content);
  return content;
}

// 获取Ollama本地模型列表
async function getOllamaModels(): Promise<OllamaModelsResponse> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      if (response.status === 0 || !response.status) {
        throw new Error('无法连接到Ollama服务，请确保Ollama正在运行');
      }
      throw new Error(`获取模型列表失败: ${response.status}`);
    }

    const data = await response.json() as OllamaModelsResponse;
    console.log('📋 Ollama模型列表:', data);
    return data;
  } catch (error) {
    console.error('获取Ollama模型失败:', error);
    throw error;
  }
}

// 获取语言名称
function getLanguageName(langCode: string): string {
  const langMap: { [key: string]: string } = {
    'zh': '中文',
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语',
    'pt': '葡萄牙语',
    'ru': '俄语',
    'ar': '阿拉伯语'
  };
  return langMap[langCode] || langCode;
}

// 解析AI返回的结果 - 改进的JSON解析逻辑
function parseAIResponse(rawResponse: string, operation: string): PageAnalysisResult {
  console.log(`[${operation}] 原始AI响应:`, rawResponse);
  
  try {
    let parsed: unknown;
    
    if (operation === 'translate') {
      // 处理翻译结果 - 解析"原文：译文"格式
      const translatedLines = rawResponse.split('\n').filter(line => line.trim());
      const translationPairs: { original: string; translated: string }[] = [];
      
      translatedLines.forEach(line => {
        // 寻找中文冒号或英文冒号作为分隔符
        const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
        if (colonIndex !== -1) {
          const original = line.substring(0, colonIndex).trim();
          const translated = line.substring(colonIndex + 1).trim();
          if (original && translated) {
            translationPairs.push({ original, translated });
          }
        }
      });
      
      // 如果解析失败，尝试按行处理（备用方案）
      if (translationPairs.length === 0) {
        translatedLines.forEach(line => {
          translationPairs.push({ 
            original: '原文', 
            translated: line.trim() 
          });
        });
      }
      
      return {
        pageType: '翻译对照',
        description: `成功翻译 ${translationPairs.length} 条文案`,
        elements: translationPairs.map((pair, index) => ({
          id: `translation-pair-${index}`,
          name: `对照 ${index + 1}`,
          type: 'TRANSLATION_PAIR',
          purpose: '翻译对照',
          properties: { 
            original: pair.original,
            translated: pair.translated,
            displayFormat: `${pair.original}：${pair.translated}`
          },
          recommendations: []
        })),
        suggestions: ['翻译对照完成', '可复制用于多语言开发'],
        timestamp: new Date().toISOString()
      };
    } else if (operation === 'translate-and-structure') {
      // 处理翻译并结构化结果 - 使用与generate-json相同的逻辑
      let cleanedResponse = rawResponse.trim();
      
      // 清理可能的markdown标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // 尝试解析JSON
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // 如果解析失败，尝试提取JSON部分
        console.error('JSON解析失败:', parseError);
        console.log('尝试清理的响应:', cleanedResponse);
        
        // 尝试提取大括号内的内容
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // 创建基础JSON结构包含原始响应
            parsed = {
              "__page_title": "翻译结构化页面",
              "error": "AI生成的JSON格式有误，请重试",
              "raw_response": rawResponse.substring(0, 500)
            };
          }
        } else {
          // 创建基础JSON结构
          parsed = {
            "__page_title": "翻译结构化页面", 
            "error": "未找到有效的JSON格式",
            "raw_response": rawResponse.substring(0, 500)
          };
        }
      }
      
      // 构建结果
      const parsedObj = parsed as Record<string, unknown>;
      
      // 验证生成的JSON内容数量（简单检查）
      const jsonString = JSON.stringify(parsed);
      const suggestions = [
        '翻译和结构化完成',
        '建议检查翻译质量',
        '建议检查键名规范性', 
        '可用于多语言前端开发'
      ];
      
      // 如果JSON内容过长，提示可能包含额外内容
      if (jsonString.length > 8000) {
        suggestions.push('⚠️ 检测到生成的JSON较大，请确认是否包含额外内容');
      }
      
      const result: PageAnalysisResult & { generatedJson?: unknown } = {
        pageType: (parsedObj.__page_title as string) || (parsedObj.page_title as string) || '翻译结构化文案',
        description: '成功翻译并生成结构化文案JSON',
        elements: [],
        suggestions,
        timestamp: new Date().toISOString(),
        // 添加生成的JSON到结果中
        generatedJson: parsed
      };
      
      console.log(`[${operation}] 解析成功的结果:`, result);
      return result;
    } else {
      // 处理JSON生成结果 - 使用与Figma插件相同的清理逻辑
      let cleanedResponse = rawResponse.trim();
      
      // 清理可能的markdown标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // 尝试解析JSON
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // 如果解析失败，尝试提取JSON部分
        console.error('JSON解析失败:', parseError);
        console.log('尝试清理的响应:', cleanedResponse);
        
        // 尝试提取大括号内的内容
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // 创建基础JSON结构包含原始响应
            parsed = {
              "__page_title": "页面标题",
              "error": "AI生成的JSON格式有误，请重试",
              "raw_response": rawResponse.substring(0, 500)
            };
          }
        } else {
          // 创建基础JSON结构
          parsed = {
            "__page_title": "页面标题", 
            "error": "未找到有效的JSON格式",
            "raw_response": rawResponse.substring(0, 500)
          };
        }
      }
      
      // 构建结果
      const parsedObj = parsed as Record<string, unknown>;
      
      // 验证生成的JSON内容数量（简单检查）
      const jsonString = JSON.stringify(parsed);
      const suggestions = [
        '文案结构已优化',
        '建议检查键名规范性', 
        '可用于前端开发'
      ];
      
      // 如果JSON内容过长，提示可能包含额外内容
      if (jsonString.length > 5000) {
        suggestions.push('⚠️ 检测到生成的JSON较大，请确认是否包含额外内容');
      }
      
      const result: PageAnalysisResult & { generatedJson?: unknown } = {
        pageType: (parsedObj.__page_title as string) || (parsedObj.page_title as string) || '文案结构',
        description: '成功生成结构化文案JSON',
        elements: [],
        suggestions,
        timestamp: new Date().toISOString(),
        // 添加生成的JSON到结果中
        generatedJson: parsed
      };
      
      console.log(`[${operation}] 解析成功的结果:`, result);
      return result;
    }
  } catch (error) {
    console.error(`[${operation}] 解析AI响应失败:`, error);
    console.error('原始响应内容:', rawResponse);
    
    return {
      pageType: '解析失败',
      description: `AI响应解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      elements: [],
      suggestions: [
        '请检查API密钥是否正确',
        '请确认网络连接正常',
        `原始响应: ${rawResponse.substring(0, 200)}...`
      ],
      timestamp: new Date().toISOString()
    };
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_WITH_AI') {
    const request = message.data as AIAnalysisRequest;
    
    callAIService(request)
      .then(rawResponse => {
        const analysis = parseAIResponse(rawResponse, request.operation);
        const response: AIAnalysisResponse = {
          analysis,
          rawResponse
        };
        
        sendResponse({
          type: 'AI_ANALYSIS_RESPONSE',
          data: response
        });
      })
      .catch(error => {
        console.error('AI服务调用失败:', error);
        sendResponse({
          type: 'AI_ANALYSIS_RESPONSE',
          error: error.message
        });
      });

    return true; // 保持消息通道开放
  }

  if (message.type === 'GET_OLLAMA_MODELS') {
    getOllamaModels()
      .then(modelsResponse => {
        sendResponse({
          type: 'OLLAMA_MODELS_RESPONSE',
          data: modelsResponse
        });
      })
      .catch(error => {
        console.error('获取Ollama模型失败:', error);
        sendResponse({
          type: 'OLLAMA_MODELS_RESPONSE',
          error: error.message
        });
      });

    return true; // 保持消息通道开放
  }
});

console.log('Figma Analyzer Background Script 已加载'); 
