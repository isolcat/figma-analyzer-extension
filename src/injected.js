// 这个脚本会被注入到Figma页面中，可以直接访问Figma的API

console.log('🚀 Figma Analyzer 注入脚本已加载');

// 检查是否在Figma环境中
function isFigmaEnvironment() {
  return typeof figma !== 'undefined' && 
         figma.currentPage && 
         figma.currentPage.selection !== undefined;
}

// 递归提取所有文案的函数 - 基于Figma插件的成功实现
async function extractTextsFromNode(node, textInfos = []) {
  if (!node) return textInfos;
  
  try {
    if (node.type === 'TEXT' && node.characters) {
      // 确保字体已加载（如果在真实Figma环境中）
      if (isFigmaEnvironment() && node.fontName && figma.loadFontAsync) {
        try {
          await figma.loadFontAsync(node.fontName);
        } catch (fontError) {
          console.warn('字体加载失败:', fontError);
        }
      }

      textInfos.push({
        id: node.id || `text-${textInfos.length}`,
        name: node.name || 'Text',
        text: node.characters,
        fontName: node.fontName ? node.fontName : { family: 'Unknown', style: 'Regular' },
        fontSize: node.fontSize || 16,
        fontFamily: node.fontName ? node.fontName.family : 'Unknown',
        fills: node.fills || [],
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 0,
        height: node.height || 0
      });
    }
    
    // 递归处理子元素
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await extractTextsFromNode(child, textInfos);
      }
    }
  } catch (error) {
    console.warn('提取节点文案时出错:', error, node);
  }
  
  return textInfos;
}

// 从选中内容提取所有文案 - 与Figma插件相同的逻辑
async function extractTextsFromSelection(selection) {
  const textInfos = [];
  
  try {
    for (const node of selection) {
      await extractTextsFromNode(node, textInfos);
    }
  } catch (error) {
    console.error('从选中内容提取文案失败:', error);
  }
  
  return textInfos;
}

// 获取当前选中的元素
async function getFigmaSelection() {
  console.log('🔍 开始获取Figma选中元素...');
  
  try {
    if (isFigmaEnvironment()) {
      console.log('✅ 检测到Figma API环境');
      
      const selection = figma.currentPage.selection;
      console.log('📋 Figma选中元素数量:', selection.length);
      
      if (selection.length === 0) {
        return {
          elements: [],
          texts: [],
          totalTextCount: 0,
          message: '请先在Figma中选中要分析的元素'
        };
      }
      
      // 使用与Figma插件相同的递归提取逻辑
      const textInfos = await extractTextsFromSelection(selection);
      console.log('📝 从Figma API提取到的文案数量:', textInfos.length);
      console.log('📝 提取到的文案内容:', textInfos.map(t => t.text));
      
      // 提取元素基本信息
      const elementInfo = selection.map(node => ({
        id: node.id,
        name: node.name || 'Unnamed',
        type: node.type,
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 0,
        height: node.height || 0
      }));
      
      return {
        elements: elementInfo,
        texts: textInfos,
        totalTextCount: textInfos.length,
        source: 'figma-api'
      };
    } else {
      console.log('⚠️ 无法访问Figma API，使用备用方案');
      return await getFallbackTexts();
    }
  } catch (error) {
    console.error('❌ 获取Figma选中元素时出错:', error);
    console.log('🔄 尝试使用备用方案...');
    return await getFallbackTexts();
  }
}

// 增强的备用文案提取方案
async function getFallbackTexts() {
  console.log('🔄 开始备用文案提取...');
  
  try {
    const textElements = [];
    
    // 方案1: 尝试从页面中提取有意义的文本
    const meaningfulTexts = extractMeaningfulTexts();
    if (meaningfulTexts.length > 0) {
      textElements.push(...meaningfulTexts);
    }
    
    // 方案2: 如果没有找到文案，尝试获取所有可见文本
    if (textElements.length === 0) {
      const visibleTexts = extractVisibleTexts();
      textElements.push(...visibleTexts);
    }
    
    console.log('📝 备用方案提取到的文案:', textElements);
    
    return {
      elements: [],
      texts: textElements,
      totalTextCount: textElements.length,
      source: 'fallback',
      message: textElements.length > 0 ? 
        `已从页面提取到 ${textElements.length} 条文案` : 
        '未找到可提取的文案，请确保在Figma中选中了包含文案的元素'
    };
  } catch (error) {
    console.error('❌ 备用方案也失败:', error);
    return {
      elements: [],
      texts: [],
      totalTextCount: 0,
      source: 'error',
      message: '文案提取失败，请重试'
    };
  }
}

// 提取有意义的文本内容
function extractMeaningfulTexts() {
  const textElements = [];
  const seenTexts = new Set();
  
  // 选择器优先级：更可能包含UI文案的元素
  const selectors = [
    '[data-testid*="text"]',
    '[class*="text"]',
    'h1, h2, h3, h4, h5, h6',
    'p',
    'span',
    'div[data-*]',
    'button',
    'a',
    'label',
    '.title, .heading, .caption, .label, .button',
    '[role="button"]',
    '[role="heading"]'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const text = element.textContent?.trim();
        if (text && 
            text.length > 1 && 
            text.length < 300 && 
            !seenTexts.has(text) &&
            isValidUIText(text)) {
          
          seenTexts.add(text);
          const rect = element.getBoundingClientRect();
          
          textElements.push({
            id: `meaningful-${textElements.length}`,
            name: `${element.tagName} ${textElements.length + 1}`,
            text: text,
            fontSize: getComputedStyle(element).fontSize || '16px',
            fontFamily: getComputedStyle(element).fontFamily || 'Unknown',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          });
        }
      });
    } catch (e) {
      console.warn(`选择器 ${selector} 查询失败:`, e);
    }
  });
  
  return textElements.slice(0, 50); // 限制数量
}

// 提取可见文本（最后的备用方案）
function extractVisibleTexts() {
  const textElements = [];
  const seenTexts = new Set();
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const text = node.textContent?.trim();
        const parent = node.parentElement;
        
        if (!text || 
            text.length < 2 || 
            text.length > 200 ||
            seenTexts.has(text) ||
            !parent ||
            !isElementVisible(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (isValidUIText(text)) {
      seenTexts.add(text);
      const parent = node.parentElement;
      const rect = parent.getBoundingClientRect();
      
      textElements.push({
        id: `visible-${textElements.length}`,
        name: `可见文本 ${textElements.length + 1}`,
        text: text,
        fontSize: getComputedStyle(parent).fontSize || '16px',
        fontFamily: getComputedStyle(parent).fontFamily || 'Unknown',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      });
      
      if (textElements.length >= 30) break; // 限制数量
    }
  }
  
  return textElements;
}

// 检查文本是否为有效的UI文案
function isValidUIText(text) {
  if (!text) return false;
  
  // 排除常见的无效文本
  const invalidPatterns = [
    /^[\s\n\r]+$/,
    /^[0-9\.\,\-\+]+$/,
    /^\s*[{}()\[\]<>]+\s*$/,
    /^https?:\/\//,
    /^[a-f0-9]{8,}$/i,
    /^\s*[\!\@\#\$\%\^\&\*\(\)\_\+\=]+\s*$/
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(text));
}

// 检查元素是否可见
function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  
  return rect.width > 0 && 
         rect.height > 0 && 
         style.visibility !== 'hidden' && 
         style.display !== 'none' &&
         style.opacity !== '0';
}

// 消息处理器
let messageHandlerAttached = false;

function attachMessageHandler() {
  if (messageHandlerAttached) return;
  
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'GET_FIGMA_SELECTION_FROM_PAGE') {
      console.log('📨 收到获取Figma选中元素的请求');
      
      try {
        const selectionData = await getFigmaSelection();
        
        // 发送数据回content script
        window.postMessage({
          type: 'FIGMA_SELECTION_DATA',
          selectionData: selectionData
        }, '*');
        
        console.log('📤 已发送选中元素数据:', selectionData);
      } catch (error) {
        console.error('❌ 处理消息时出错:', error);
        
        window.postMessage({
          type: 'FIGMA_SELECTION_DATA',
          selectionData: {
            elements: [],
            texts: [],
            totalTextCount: 0,
            error: error.message
          }
        }, '*');
      }
    }
  });
  
  messageHandlerAttached = true;
  console.log('✅ 消息处理器已附加');
}

// 等待页面加载完成
function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(attachMessageHandler, 500);
    });
  } else {
    setTimeout(attachMessageHandler, 100);
  }
}

// 定期检查Figma API状态
let apiCheckCount = 0;
const maxApiChecks = 30;

function checkFigmaAPIStatus() {
  apiCheckCount++;
  
  if (isFigmaEnvironment()) {
    console.log('✅ Figma API 可用');
    attachMessageHandler();
    return;
  }
  
  if (apiCheckCount < maxApiChecks) {
    setTimeout(checkFigmaAPIStatus, 300);
  } else {
    console.log('⚠️ Figma API 检查超时，使用备用模式');
    attachMessageHandler();
  }
}

// 初始化
initializeWhenReady();
checkFigmaAPIStatus();

console.log('✅ Figma Analyzer 注入脚本初始化完成'); 
