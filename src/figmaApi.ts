import type { FigmaFileResponse, FigmaNode, FigmaTextInfo } from './types';

/**
 * Figma REST API 服务类
 * 使用官方 API 替代注入脚本的方式
 */
export class FigmaApiService {
  private apiToken: string;
  private baseUrl = 'https://api.figma.com/v1';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * 从 Figma URL 中提取文件 ID
   * 支持多种 Figma URL 格式
   */
  static extractFileIdFromUrl(url: string): string | null {
    console.log('🔍 正在解析 URL:', url);
    
    // 支持的 Figma URL 格式：
    // 1. https://www.figma.com/file/{file-id}/{file-name}
    // 2. https://www.figma.com/design/{file-id}/{file-name}  (新格式)
    // 3. https://figma.com/file/{file-id}/{file-name}        (无www)
    // 4. https://figma.com/design/{file-id}/{file-name}      (无www + 新格式)
    // 5. 带查询参数的版本，如: ?node-id=...&t=...
    
    const patterns = [
      // 匹配 /file/ 或 /design/ 路径
      /(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9-_]+)/,
      // 备用模式：更宽松的匹配
      /figma\.com\/[^/]+\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const fileId = match[1];
        console.log('✅ 成功提取文件 ID:', fileId);
        return fileId;
      }
    }
    
    console.error('❌ 无法从 URL 中提取文件 ID');
    console.error('当前 URL:', url);
    console.error('支持的 URL 格式:');
    console.error('  - https://www.figma.com/file/{file-id}/{file-name}');
    console.error('  - https://www.figma.com/design/{file-id}/{file-name}');
    console.error('  - https://figma.com/file/{file-id}/{file-name}');
    console.error('  - https://figma.com/design/{file-id}/{file-name}');
    
    return null;
  }

  /**
   * 从 Figma URL 中提取节点 ID (当用户选中元素并复制链接时)
   */
  static extractNodeIdFromUrl(url: string): string | null {
    console.log('🔍 正在提取节点 ID:', url);
    
    // URL 格式示例：
    // https://www.figma.com/design/abc123/project?node-id=123%3A456&t=xyz
    // https://www.figma.com/file/abc123/project?node-id=123-456
    
    const nodeIdMatch = url.match(/[?&]node-id=([^&]+)/);
    if (nodeIdMatch) {
      // 处理URL编码的冒号 (%3A) 和连字符
      let nodeId = decodeURIComponent(nodeIdMatch[1]);
      nodeId = nodeId.replace('%3A', ':').replace('-', ':');
      console.log('✅ 成功提取节点 ID:', nodeId);
      return nodeId;
    }
    
    console.log('ℹ️ URL 中未包含节点 ID');
    return null;
  }

  /**
   * 获取文件的页面列表
   */
  async getFilePages(fileId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    try {
      const fileData = await this.getFile(fileId);
      const pages = fileData.document.children || [];
      
      const pageList = pages
        .filter(child => child.type === 'CANVAS') // CANVAS 类型表示页面
        .map(page => ({
          id: page.id,
          name: page.name,
          type: page.type
        }));
      
      console.log('📄 文件页面列表:', pageList);
      return pageList;
    } catch (error) {
      console.error('获取页面列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取 Figma 文件数据
   */
  async getFile(fileId: string): Promise<FigmaFileResponse> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': this.apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API 错误 (${response.status}): ${errorText}`);
    }

    return await response.json() as FigmaFileResponse;
  }

  /**
   * 根据节点 ID 查找特定节点
   */
  private findNodeById(node: FigmaNode, targetId: string): FigmaNode | null {
    if (node.id === targetId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, targetId);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * 递归提取节点中的所有文案
   */
  private extractTextsFromNode(node: FigmaNode, texts: FigmaTextInfo[] = []): FigmaTextInfo[] {
    try {
      // 如果是文本节点且有文案内容
      if (node.type === 'TEXT' && node.characters) {
        const boundingBox = node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 };
        
        texts.push({
          id: node.id,
          name: node.name,
          text: node.characters,
          fontSize: node.style?.fontSize || 16,
          fontFamily: node.style?.fontFamily || 'Unknown',
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height
        });
      }

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          this.extractTextsFromNode(child, texts);
        }
      }
    } catch (error) {
      console.warn('提取节点文案时出错:', error, node);
    }

    return texts;
  }

  /**
   * 获取文件中的所有文案
   */
  async getFileTexts(fileId: string): Promise<FigmaTextInfo[]> {
    try {
      console.log('🔍 开始获取 Figma 文件数据...');
      
      const fileData = await this.getFile(fileId);
      console.log('📁 文件信息:', {
        name: fileData.name,
        lastModified: fileData.lastModified,
        version: fileData.version
      });

      // 从文档根节点开始提取所有文案
      const texts = this.extractTextsFromNode(fileData.document);
      
      console.log('📝 提取到的文案数量:', texts.length);
      console.log('📝 文案内容预览:', texts.slice(0, 5).map(t => t.text));

      return texts;
    } catch (error) {
      console.error('❌ 获取 Figma 文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定页面的文案
   */
  async getPageTexts(fileId: string, pageId?: string): Promise<FigmaTextInfo[]> {
    try {
      const fileData = await this.getFile(fileId);
      
      let targetNode = fileData.document;
      
      // 如果指定了页面ID，尝试找到对应页面
      if (pageId && fileData.document.children) {
        const page = fileData.document.children.find(child => child.id === pageId);
        if (page) {
          targetNode = page;
          console.log('📄 找到指定页面:', page.name);
        } else {
          console.warn('⚠️ 未找到指定页面，使用整个文档');
        }
      }

      const texts = this.extractTextsFromNode(targetNode);
      console.log('📝 从页面提取到的文案数量:', texts.length);

      return texts;
    } catch (error) {
      console.error('❌ 获取页面文案失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定节点及其子节点的文案
   */
  async getNodeTexts(fileId: string, nodeId: string): Promise<FigmaTextInfo[]> {
    try {
      console.log('🎯 开始获取指定节点的文案...', { fileId, nodeId });
      
      const fileData = await this.getFile(fileId);
      
      // 查找目标节点
      const targetNode = this.findNodeById(fileData.document, nodeId);
      if (!targetNode) {
        throw new Error(`未找到节点 ID: ${nodeId}`);
      }
      
      console.log('✅ 找到目标节点:', targetNode.name, targetNode.type);
      
      // 提取该节点及其子节点的所有文案
      const texts = this.extractTextsFromNode(targetNode);
      
      console.log('📝 从选中节点提取到的文案数量:', texts.length);
      console.log('📝 文案内容预览:', texts.slice(0, 5).map(t => t.text));

      return texts;
    } catch (error) {
      console.error('❌ 获取节点文案失败:', error);
      throw error;
    }
  }

  /**
   * 智能获取文案 - 优先级：节点 > 页面 > 整个文件
   */
  async getSmartTexts(fileId: string, options: {
    nodeId?: string;
    pageId?: string;
    useFullFile?: boolean;
  } = {}): Promise<{ texts: FigmaTextInfo[]; source: string }> {
    const { nodeId, pageId, useFullFile } = options;
    
    try {
      if (nodeId) {
        console.log('🎯 使用节点级别筛选');
        const texts = await this.getNodeTexts(fileId, nodeId);
        return { texts, source: `节点: ${nodeId}` };
      }
      
      if (pageId) {
        console.log('📄 使用页面级别筛选');
        const texts = await this.getPageTexts(fileId, pageId);
        return { texts, source: `页面: ${pageId}` };
      }
      
      if (useFullFile) {
        console.log('📁 获取整个文件');
        const texts = await this.getFileTexts(fileId);
        return { texts, source: '整个文件' };
      }
      
      // 默认获取第一个页面
      console.log('📄 默认获取第一个页面');
      const pages = await this.getFilePages(fileId);
      if (pages.length > 0) {
        const texts = await this.getPageTexts(fileId, pages[0].id);
        return { texts, source: `页面: ${pages[0].name}` };
      }
      
      // 最后的备选方案
      const texts = await this.getFileTexts(fileId);
      return { texts, source: '整个文件 (备选方案)' };
      
    } catch (error) {
      console.error('智能获取文案失败:', error);
      throw error;
    }
  }

  /**
   * 验证 API Token 是否有效
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'X-Figma-Token': this.apiToken,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('验证 Figma API Token 失败:', error);
      return false;
    }
  }
} 
