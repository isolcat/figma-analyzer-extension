# Figma AI Analyzer

[English](README.md) | [中文](README_CN.md)

Chrome Extension for Figma design element AI analysis with real-time extraction and standardized reporting.

## Core Features

- 🎯 **Real-time Element Extraction** - Direct access to selected Figma Web elements
- 🤖 **AI-Powered Analysis** - Integrated DeepSeek API for structured analysis
- 📋 **Standardized Output** - Professional design analysis in JSON format
- ⚙️ **Custom Prompts** - Support for personalized AI analysis strategies

## Tech Stack

```
React 19 + TypeScript + Vite 6
Chrome Extension Manifest V3
@crxjs/vite-plugin
DeepSeek AI API
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build extension
pnpm build

# Load to Chrome
# chrome://extensions/ -> Developer mode -> Load unpacked -> Select dist directory
```

## Usage Flow

1. **Configure** - Set DeepSeek API key in extension
2. **Select** - Choose target design elements in Figma
3. **Extract** - Click extension to fetch element data
4. **Analyze** - AI generates standardized analysis report

## Architecture

```
Background Script    <- API calls and data processing
Popup Interface      <- User interaction interface  
Content Script       <- Message communication bridge
Injected Script      <- Figma API access
```

## Output Example

```json
{
  "pageType": "Login Interface",
  "elements": [
    {
      "name": "Login Button",
      "type": "RECTANGLE", 
      "purpose": "User authentication submission",
      "recommendations": ["Add hover effects", "Optimize click feedback"]
    }
  ],
  "suggestions": ["Unify visual hierarchy", "Optimize interaction flow"]
}
```

## License

MIT
