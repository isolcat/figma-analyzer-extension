# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# Figma AI Analyzer - Chrome扩展

一个强大的Chrome扩展，可以在网页版Figma中获取选中的设计元素，并通过AI分析生成标准化的JSON格式分析结果。

## 功能特点

- 🎨 **直接从Figma获取数据**：自动提取选中的Figma设计元素信息
- 🤖 **AI智能分析**：集成DeepSeek AI，提供专业的设计分析
- 📊 **标准化输出**：生成结构化的JSON格式分析结果
- ⚙️ **自定义配置**：支持自定义AI提示词
- 🔒 **安全存储**：本地安全存储API密钥和设置

## 技术栈

- React 19 + TypeScript
- Vite 6 + @crxjs/vite-plugin
- Chrome Extension Manifest V3
- DeepSeek AI API

## 安装和使用

### 1. 开发环境设置

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build
```

### 2. 加载到Chrome

1. 运行 `pnpm build` 构建扩展
2. 打开Chrome，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 文件夹

### 3. 配置API密钥

1. 注册DeepSeek账号并获取API密钥
2. 在扩展弹窗中输入API密钥并保存

### 4. 使用步骤

1. 在Figma网页版中打开设计文件
2. 选中要分析的设计元素
3. 点击浏览器工具栏中的扩展图标
4. 点击"获取Figma选中元素"
5. 点击"开始AI分析"
6. 查看分析结果并复制JSON数据

## 功能说明

### 支持的Figma元素类型

- 文本元素（TEXT）
- 矩形（RECTANGLE）
- 圆形（ELLIPSE）
- 组件（COMPONENT）
- 实例（INSTANCE）
- 组（GROUP）
- 框架（FRAME）
- 等等...

### AI分析输出格式

```json
{
  "pageType": "登录页",
  "description": "这是一个简洁的用户登录界面",
  "elements": [
    {
      "id": "element-id",
      "name": "登录按钮",
      "type": "RECTANGLE",
      "purpose": "用户提交登录信息",
      "properties": {
        "width": 200,
        "height": 44,
        "backgroundColor": "#007AFF"
      },
      "recommendations": [
        "建议增加悬停状态",
        "考虑添加加载动画"
      ]
    }
  ],
  "suggestions": [
    "整体布局清晰，建议增加错误提示区域",
    "色彩搭配合理，保持一致性"
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 项目结构

```
src/
├── components/          # React组件
│   └── FigmaAnalyzer.tsx
├── manifest.json        # Chrome扩展配置
├── background.ts        # 后台脚本
├── content.ts          # 内容脚本
├── injected.js         # 注入脚本
├── popup.html          # 弹窗页面
├── popup.tsx           # 弹窗入口
├── popup.css           # 样式文件
└── types.ts            # TypeScript类型定义
```

## 开发说明

### 核心原理

1. **Content Script**: 注入到Figma页面，负责消息通信
2. **Injected Script**: 直接访问Figma API获取选中元素
3. **Popup UI**: React界面，用户交互
4. **Background Service Worker**: 处理AI API调用

### 关键技术点

- 使用Chrome Extension Manifest V3
- 通过`window.postMessage`与页面通信
- 利用Figma的内部API获取设计数据
- 集成DeepSeek AI进行智能分析

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！
