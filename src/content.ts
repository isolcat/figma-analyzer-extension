import type { ChromeMessage } from './types';

// 注入脚本到页面中以访问Figma API
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/injected.js');
  script.onload = function() {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  };
  (document.head || document.documentElement).appendChild(script);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
  if (message.type === 'GET_FIGMA_SELECTION') {
    // 向页面发送获取选中元素的请求
    window.postMessage({ type: 'GET_FIGMA_SELECTION_FROM_PAGE' }, '*');
    
    // 监听页面返回的数据
    const messageListener = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'FIGMA_SELECTION_DATA') {
        window.removeEventListener('message', messageListener);
        sendResponse({
          type: 'FIGMA_DATA_RESPONSE',
          data: event.data.selectionData
        });
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // 设置超时
    setTimeout(() => {
      window.removeEventListener('message', messageListener);
      sendResponse({
        type: 'FIGMA_DATA_RESPONSE',
        error: '获取Figma选中元素超时'
      });
    }, 5000);
    
    return true; // 保持消息通道开放
  }
});

// 监听页面加载完成后注入脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}

console.log('Figma Analyzer Content Script 已加载'); 
