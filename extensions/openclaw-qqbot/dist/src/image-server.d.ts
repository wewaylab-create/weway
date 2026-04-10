/**
 * 本地图床服务器
 * 提供安全的图片存储和访问服务
 */
export interface ImageServerConfig {
    /** 监听端口 */
    port: number;
    /** 图片存储目录 */
    storageDir: string;
    /** 外部访问的基础 URL（如 http://your-server:port），留空则自动生成 */
    baseUrl?: string;
    /** 图片过期时间（秒），0 表示不过期 */
    ttlSeconds?: number;
    /** 允许的图片格式 */
    allowedFormats?: string[];
}
/**
 * 启动图床服务器
 */
export declare function startImageServer(config?: Partial<ImageServerConfig>): Promise<string>;
/**
 * 停止图床服务器
 */
export declare function stopImageServer(): Promise<void>;
/**
 * 保存图片并返回访问 URL
 * @param imageData 图片数据（Buffer 或 base64 字符串）
 * @param mimeType 图片 MIME 类型
 * @param ttlSeconds 过期时间（秒），默认使用配置值
 * @returns 图片访问 URL
 */
export declare function saveImage(imageData: Buffer | string, mimeType?: string, ttlSeconds?: number): string;
/**
 * 从本地文件路径保存图片到图床
 * @param filePath 本地文件路径
 * @param ttlSeconds 过期时间（秒），默认使用配置值
 * @returns 图片访问 URL，如果文件不存在或不是图片则返回 null
 */
export declare function saveImageFromPath(filePath: string, ttlSeconds?: number): string | null;
/**
 * 检查图床服务器是否运行中
 */
export declare function isImageServerRunning(): boolean;
/**
 * 确保图床服务器正在运行
 * 如果未运行，则自动启动
 * @param publicBaseUrl 公网访问的基础 URL（如 http://your-server:18765）
 * @returns 基础 URL，启动失败返回 null
 */
export declare function ensureImageServer(publicBaseUrl?: string): Promise<string | null>;
/** downloadFile 的返回结果 */
export interface DownloadResult {
    /** 下载成功时的本地文件路径（位于系统临时目录，调用方用完后应删除） */
    filePath: string | null;
    /** 下载失败时的错误信息（用于兜底消息展示） */
    error?: string;
}
/**
 * 下载远程文件到系统临时目录。
 *
 * 文件名采用 UUID 保证不重名不覆盖，调用方用完后应自行删除。
 *
 * 安全措施：
 * 1. SSRF 防护 — DNS 解析后校验 IP，拒绝私有/保留网段
 * 2. Content-Type 黑名单 — 拦截 text/html（登录页/错误页/人机验证页）
 * 3. 超时控制 — 默认 30 秒，传 0 表示不限时
 * 4. 大小限制 — 可选，通过 Content-Length 预检 + 流式字节计数双重保护
 *
 * @param url 远程文件 URL
 * @param originalFilename 原始文件名（可选，仅用于推导扩展名）
 * @param options 下载选项
 * @returns DownloadResult，filePath 为 null 表示失败，error 包含失败原因
 */
export declare function downloadFile(url: string, originalFilename?: string, options?: {
    /** 超时时间（毫秒），默认 30000（30 秒）。传 0 表示不限时 */
    timeoutMs?: number;
    /** 指定下载目标目录。不传则使用系统临时目录（调用方用完后应删除） */
    destDir?: string;
    /** 下载大小上限（字节）。超过此值中断下载并返回错误。不传则不限制 */
    maxSizeBytes?: number;
    /** 网络错误时的最大重试次数，默认 2（即最多尝试 3 次） */
    maxRetries?: number;
}): Promise<DownloadResult>;
/**
 * 获取图床服务器配置
 */
export declare function getImageServerConfig(): Required<ImageServerConfig>;
