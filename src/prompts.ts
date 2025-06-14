// AI提示词模板集合

// 生成结构化JSON的提示词
export const ANALYSIS_PROMPT_TEMPLATE = `你是一位专业的前端开发工程师，请将以下从Figma提取的界面文案严格按原文组织成结构化的JSON文件。

**重要说明**：
- 严格使用提取的原文内容，不要添加、修改或推测任何文案
- 不要创造任何额外的内容或占位符
- 只对现有文案进行分类和结构化组织

【项目背景】
{projectDescription}

【提取的界面文案】（共 {textCount} 条）
{allTexts}

请将上述文案按以下要求组织成JSON结构：

1. **严格内容要求**：
   - 只使用上面列出的实际文案内容
   - 不要添加任何未在提取列表中出现的文案
   - 不要创造示例文案或占位符
   - 每个提取的文案都必须在JSON中有对应位置

2. **JSON键名规范**：
   - 使用有意义的英文标识符作为键名
   - 页面标题用 "__page_title"
   - 标签页用 "tab1", "tab2" 等
   - 区块用 "section1", "section2" 等  
   - 标题用 "title", "heading" 等
   - 按钮用 "btn_xxx" 或具体功能名
   - 普通文本用 "text", "label" 等

3. **结构组织原则**：
   - 根据文案的语义和可能的界面关系分组
   - 相似功能的文案放在同一个对象下
   - 保持层级清晰，便于开发使用

4. **返回格式**：
   - 返回标准JSON格式
   - 不要添加markdown标记或其他格式
   - 确保所有 {textCount} 条提取的文案都被包含在JSON中

请开始生成JSON：`;

// 纯翻译的提示词
export const TRANSLATION_PROMPT_TEMPLATE = `作为专业的UI/UX文案翻译专家，请将以下英文文案翻译成{targetLanguage}，并按照对照格式返回。

**关键要求**：
1. 必须保留完整的英文原文
2. 严格按照"英文原文：{targetLanguage}译文"的格式
3. 每行一对，原文在左，译文在右
4. 保持简洁明了，适合界面显示
5. 考虑用户体验和文化背景
6. 不要添加序号、引号或其他标记

**格式示例**：
Improve your front-end skills by building projects：通过构建项目提升您的前端技能
Scan the QR code to visit Frontend Mentor：扫描二维码访问Frontend Mentor

**重要**：每行必须包含完整的英文原文，然后是冒号，然后是{targetLanguage}翻译！

请翻译以下英文界面文案：
{textsToTranslate}`;

// 翻译并结构化的提示词
export const TRANSLATE_AND_STRUCTURE_PROMPT_TEMPLATE = `你是一位专业的前端开发工程师和UI/UX翻译专家，请将以下从Figma提取的界面文案翻译成{targetLanguage}，并严格按翻译后的内容组织成结构化的JSON文件。

**重要说明**：
- 严格使用提取的原文内容，先翻译，再结构化
- 不要添加、修改或推测任何文案
- 不要创造任何额外的内容或占位符
- 只对翻译后的文案进行分类和结构化组织

【项目背景】
{projectDescription}

【提取的界面文案】（共 {textCount} 条）
{allTexts}

请按以下步骤处理：

1. **翻译要求**：
   - 将所有文案翻译成{targetLanguage}
   - 保持简洁明了，适合界面显示
   - 考虑用户体验和文化背景
   - 保持原文的语气和风格

2. **严格内容要求**：
   - 只使用上面列出的实际文案内容的翻译版本
   - 不要添加任何未在提取列表中出现的文案
   - 不要创造示例文案或占位符
   - 每个提取的文案都必须在JSON中有对应的翻译版本

3. **JSON键名规范**：
   - 使用有意义的英文标识符作为键名（键名保持英文）
   - 页面标题用 "__page_title"
   - 标签页用 "tab1", "tab2" 等
   - 区块用 "section1", "section2" 等  
   - 标题用 "title", "heading" 等
   - 按钮用 "btn_xxx" 或具体功能名
   - 普通文本用 "text", "label" 等

4. **结构组织原则**：
   - 根据文案的语义和可能的界面关系分组
   - 相似功能的文案放在同一个对象下
   - 保持层级清晰，便于开发使用

5. **返回格式**：
   - 返回标准JSON格式
   - 不要添加markdown标记或其他格式
   - 确保所有 {textCount} 条提取的文案都被翻译并包含在JSON中

请开始翻译并生成JSON：`; 
