# Figma AI Analyzer

[English](README.md) | [中文](README_CN.md)

基于Chrome Extension的Figma设计元素AI分析工具，支持实时提取选中元素并生成标准化分析报告。

## 核心功能

- 🎯 **实时元素提取** - 直接从Figma Web版获取选中设计元素
- 🤖 **AI智能分析** - 集成DeepSeek API，生成结构化分析结果
- 📋 **标准化输出** - JSON格式的专业设计分析报告
- ⚙️ **自定义提示** - 支持个性化AI分析策略

## 技术栈

```
React 19 + TypeScript + Vite 6
Chrome Extension Manifest V3
@crxjs/vite-plugin
DeepSeek AI API
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建扩展
pnpm build

# 加载到Chrome
# chrome://extensions/ -> 开发者模式 -> 加载已解压的扩展程序 -> 选择dist目录
```

## 使用流程

1. **配置** - 在扩展中设置DeepSeek API密钥
2. **选择** - 在Figma中选中目标设计元素
3. **提取** - 点击扩展获取元素数据
4. **分析** - AI生成标准化分析报告

## 架构说明

```
Background Script    <- API调用和数据处理
Popup Interface      <- 用户交互界面  
Content Script       <- 消息通信桥梁
Injected Script      <- Figma API访问
```

## 输出示例

```json
{
  "pageType": "登录界面",
  "elements": [
    {
      "name": "登录按钮",
      "type": "RECTANGLE", 
      "purpose": "用户认证提交",
      "recommendations": ["增加悬停效果", "优化点击反馈"]
    }
  ],
  "suggestions": ["统一视觉层次", "优化交互流程"]
}
```

## License

MIT 
