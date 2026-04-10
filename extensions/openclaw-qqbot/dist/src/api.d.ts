/**
 * QQ Bot API 鉴权和请求封装
 * [修复版] 已重构为支持多实例并发，消除全局变量冲突
 */
/** API 模块的日志接口，与 GatewayContext.log 对齐 */
export interface ApiLogger {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn?: (msg: string) => void;
    debug?: (msg: string) => void;
}
/**
 * 注入自定义 logger（在 gateway 启动时调用，将 api 模块的日志统一接入框架日志系统）
 */
export declare function setApiLogger(logger: ApiLogger): void;
/** API 请求错误，携带 HTTP status code 和业务错误码 */
export declare class ApiError extends Error {
    readonly status: number;
    readonly path: string;
    /** 业务错误码（回包中的 code / err_code 字段），不一定存在 */
    readonly bizCode?: number | undefined;
    /** 回包中的原始 message 字段（用于向用户展示兜底文案） */
    readonly bizMessage?: string | undefined;
    constructor(message: string, status: number, path: string, 
    /** 业务错误码（回包中的 code / err_code 字段），不一定存在 */
    bizCode?: number | undefined, 
    /** 回包中的原始 message 字段（用于向用户展示兜底文案） */
    bizMessage?: string | undefined);
}
/** 由 setQQBotRuntime 调用，将 api.runtime.version 注入到 User-Agent */
export declare function setOpenClawVersion(version: string): void;
export declare function getPluginUserAgent(): string;
/** 出站消息元信息（结构化存储，不做预格式化） */
export interface OutboundMeta {
    /** 消息文本内容 */
    text?: string;
    /** 媒体类型 */
    mediaType?: "image" | "voice" | "video" | "file";
    /** 媒体来源：在线 URL */
    mediaUrl?: string;
    /** 媒体来源：本地文件路径或文件名 */
    mediaLocalPath?: string;
    /** TTS 原文本（仅 voice 类型有效，用于保存 TTS 前的文本内容） */
    ttsText?: string;
}
type OnMessageSentCallback = (refIdx: string, meta: OutboundMeta) => void;
/**
 * 注册出站消息回调
 * 当消息发送成功且 QQ 返回 ref_idx 时，自动回调此函数
 * 用于在最底层统一缓存 bot 出站消息的 refIdx
 */
export declare function onMessageSent(callback: OnMessageSentCallback): void;
/**
 * 初始化 API 配置
 */
export declare function initApiConfig(options: {
    markdownSupport?: boolean;
}): void;
/**
 * 获取当前是否支持 markdown
 */
export declare function isMarkdownSupport(): boolean;
/**
 * 获取 AccessToken（带缓存 + singleflight 并发安全）
 *
 * 使用 singleflight 模式：当多个请求同时发现 Token 过期时，
 * 只有第一个请求会真正去获取新 Token，其他请求复用同一个 Promise。
 *
 * 按 appId 隔离，支持多机器人并发请求。
 */
export declare function getAccessToken(appId: string, clientSecret: string): Promise<string>;
/**
 * 清除 Token 缓存
 * @param appId 选填。如果有，只清空特定账号的缓存；如果没有，清空所有账号。
 */
export declare function clearTokenCache(appId?: string): void;
/**
 * 获取 Token 缓存状态（用于监控）
 */
export declare function getTokenStatus(appId: string): {
    status: "valid" | "expired" | "refreshing" | "none";
    expiresAt: number | null;
};
/**
 * 获取全局唯一的消息序号（范围 0 ~ 65535）
 * 使用毫秒级时间戳低位 + 随机数异或混合，无状态，避免碰撞
 */
export declare function getNextMsgSeq(_msgId: string): number;
/**
 * API 请求封装
 */
export declare function apiRequest<T = unknown>(accessToken: string, method: string, path: string, body?: unknown, timeoutMs?: number): Promise<T>;
/**
 * 需要持续重试的业务错误码集合
 * 当 upload_part_finish 返回这些错误码时，会以固定 1s 间隔持续重试直到成功或超时
 */
export declare const PART_FINISH_RETRYABLE_CODES: Set<number>;
/**
 * upload_prepare 接口命中此错误码时，携带文件信息抛出 UploadDailyLimitExceededError，
 * 由上层（outbound.ts）构造包含文件路径和大小的兜底文案发送给用户，
 * 而非走通用的"文件发送失败，请稍后重试"
 */
export declare const UPLOAD_PREPARE_FALLBACK_CODE = 40093002;
export declare function getGatewayUrl(accessToken: string): Promise<string>;
/** 回应按钮交互（INTERACTION_CREATE），避免客户端按钮持续 loading */
export declare function acknowledgeInteraction(accessToken: string, interactionId: string, code?: 0 | 1 | 2 | 3 | 4 | 5, data?: Record<string, unknown>): Promise<void>;
/** 获取插件版本号（从 package.json 读取，和 getPluginUserAgent() 同源） */
export declare function getApiPluginVersion(): string;
export interface MessageResponse {
    id: string;
    timestamp: number | string;
    /** 消息的引用索引信息（出站时由 QQ 服务端返回） */
    ext_info?: {
        ref_idx?: string;
    };
}
export declare function sendC2CMessage(accessToken: string, openid: string, content: string, msgId?: string, messageReference?: string): Promise<MessageResponse>;
export declare function sendC2CInputNotify(accessToken: string, openid: string, msgId?: string, inputSecond?: number): Promise<{
    refIdx?: string;
}>;
export declare function sendChannelMessage(accessToken: string, channelId: string, content: string, msgId?: string): Promise<{
    id: string;
    timestamp: string;
}>;
/**
 * 发送频道私信消息
 * @param guildId - 私信会话的 guild_id（由 DIRECT_MESSAGE_CREATE 事件提供）
 * @param msgId - 被动回复时必填
 */
export declare function sendDmMessage(accessToken: string, guildId: string, content: string, msgId?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendGroupMessage(accessToken: string, groupOpenid: string, content: string, msgId?: string, messageReference?: string): Promise<MessageResponse>;
/** 发送带 Inline Keyboard 的 C2C 消息（回调型按钮，触发 INTERACTION_CREATE） */
export declare function sendC2CMessageWithInlineKeyboard(accessToken: string, openid: string, content: string, inlineKeyboard: import("./types.js").InlineKeyboard, msgId?: string): Promise<MessageResponse>;
/** 发送带 Inline Keyboard 的 Group 消息（回调型按钮，触发 INTERACTION_CREATE） */
export declare function sendGroupMessageWithInlineKeyboard(accessToken: string, groupOpenid: string, content: string, inlineKeyboard: import("./types.js").InlineKeyboard, msgId?: string): Promise<MessageResponse>;
export declare function sendProactiveC2CMessage(accessToken: string, openid: string, content: string): Promise<MessageResponse>;
export declare function sendProactiveGroupMessage(accessToken: string, groupOpenid: string, content: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare enum MediaFileType {
    IMAGE = 1,
    VIDEO = 2,
    VOICE = 3,
    FILE = 4
}
export interface UploadMediaResponse {
    file_uuid: string;
    file_info: string;
    ttl: number;
    id?: string;
}
/** 分片信息 */
export interface UploadPart {
    /** 分片索引（从 1 开始） */
    index: number;
    /** 预签名上传链接 */
    presigned_url: string;
}
/** 申请上传响应 */
export interface UploadPrepareResponse {
    /** 上传任务 ID */
    upload_id: string;
    /** 分块大小（字节） */
    block_size: number;
    /** 分片列表（含预签名链接） */
    parts: UploadPart[];
    /** 上传并发数（由服务端控制，可选，不返回时使用客户端默认值） */
    concurrency?: number;
    /** upload_part_finish 特定错误码的重试超时时间（秒），由服务端控制，客户端上限 10 分钟 */
    retry_timeout?: number;
}
/** 完成文件上传响应（与 UploadMediaResponse 一致） */
export interface MediaUploadResponse {
    /** 文件 UUID */
    file_uuid: string;
    /** 文件信息（用于发送消息），是 InnerUploadRsp 的序列化 */
    file_info: string;
    /** 文件信息过期时长（秒） */
    ttl: number;
}
/** 申请上传时的文件哈希信息 */
export interface UploadPrepareHashes {
    /** 整个文件的 MD5（十六进制） */
    md5: string;
    /** 整个文件的 SHA1（十六进制） */
    sha1: string;
    /** 文件前 10002432 Bytes 的 MD5（十六进制）；文件不足该大小时为整文件 MD5 */
    md5_10m: string;
}
/**
 * 申请上传（C2C）
 * POST /v2/users/{user_id}/upload_prepare
 *
 * @param accessToken - 访问令牌
 * @param userId - 用户 openid
 * @param fileType - 业务类型（1=图片, 2=视频, 3=语音, 4=文件）
 * @param fileName - 文件名
 * @param fileSize - 文件大小（字节）
 * @param hashes - 文件哈希信息（md5, sha1, md5_10m）
 * @returns 上传任务 ID、分块大小、分片预签名链接列表
 */
export declare function c2cUploadPrepare(accessToken: string, userId: string, fileType: MediaFileType, fileName: string, fileSize: number, hashes: UploadPrepareHashes): Promise<UploadPrepareResponse>;
/**
 * 完成分片上传（C2C）
 * POST /v2/users/{user_id}/upload_part_finish
 *
 * @param accessToken - 访问令牌
 * @param userId - 用户 openid
 * @param uploadId - 上传任务 ID
 * @param partIndex - 分片索引（从 1 开始）
 * @param blockSize - 分块大小（字节）
 * @param md5 - 分片数据的 MD5（十六进制）
 */
export declare function c2cUploadPartFinish(accessToken: string, userId: string, uploadId: string, partIndex: number, blockSize: number, md5: string, retryTimeoutMs?: number): Promise<void>;
/**
 * 完成文件上传（C2C）
 * POST /v2/users/{user_id}/files
 *
 * @param accessToken - 访问令牌
 * @param userId - 用户 openid
 * @param uploadId - 上传任务 ID
 * @returns 文件信息（file_uuid, file_info, ttl）
 */
export declare function c2cCompleteUpload(accessToken: string, userId: string, uploadId: string): Promise<MediaUploadResponse>;
/**
 * 申请上传（Group）
 * POST /v2/groups/{group_id}/upload_prepare
 */
export declare function groupUploadPrepare(accessToken: string, groupId: string, fileType: MediaFileType, fileName: string, fileSize: number, hashes: UploadPrepareHashes): Promise<UploadPrepareResponse>;
/**
 * 完成分片上传（Group）
 * POST /v2/groups/{group_id}/upload_part_finish
 */
export declare function groupUploadPartFinish(accessToken: string, groupId: string, uploadId: string, partIndex: number, blockSize: number, md5: string, retryTimeoutMs?: number): Promise<void>;
/**
 * 完成文件上传（Group）
 * POST /v2/groups/{group_id}/files
 */
export declare function groupCompleteUpload(accessToken: string, groupId: string, uploadId: string): Promise<MediaUploadResponse>;
export declare function uploadC2CMedia(accessToken: string, openid: string, fileType: MediaFileType, url?: string, fileData?: string, srvSendMsg?: boolean, fileName?: string): Promise<UploadMediaResponse>;
export declare function uploadGroupMedia(accessToken: string, groupOpenid: string, fileType: MediaFileType, url?: string, fileData?: string, srvSendMsg?: boolean, fileName?: string): Promise<UploadMediaResponse>;
export declare function sendC2CMediaMessage(accessToken: string, openid: string, fileInfo: string, msgId?: string, content?: string, meta?: OutboundMeta): Promise<MessageResponse>;
export declare function sendGroupMediaMessage(accessToken: string, groupOpenid: string, fileInfo: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CImageMessage(accessToken: string, openid: string, imageUrl: string, msgId?: string, content?: string, localPath?: string): Promise<MessageResponse>;
export declare function sendGroupImageMessage(accessToken: string, groupOpenid: string, imageUrl: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CVoiceMessage(accessToken: string, openid: string, voiceBase64?: string, voiceUrl?: string, msgId?: string, ttsText?: string, filePath?: string): Promise<MessageResponse>;
export declare function sendGroupVoiceMessage(accessToken: string, groupOpenid: string, voiceBase64?: string, voiceUrl?: string, msgId?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CFileMessage(accessToken: string, openid: string, fileBase64?: string, fileUrl?: string, msgId?: string, fileName?: string, localFilePath?: string): Promise<MessageResponse>;
export declare function sendGroupFileMessage(accessToken: string, groupOpenid: string, fileBase64?: string, fileUrl?: string, msgId?: string, fileName?: string): Promise<{
    id: string;
    timestamp: string;
}>;
export declare function sendC2CVideoMessage(accessToken: string, openid: string, videoUrl?: string, videoBase64?: string, msgId?: string, content?: string, localPath?: string): Promise<MessageResponse>;
export declare function sendGroupVideoMessage(accessToken: string, groupOpenid: string, videoUrl?: string, videoBase64?: string, msgId?: string, content?: string): Promise<{
    id: string;
    timestamp: string;
}>;
interface BackgroundTokenRefreshOptions {
    refreshAheadMs?: number;
    randomOffsetMs?: number;
    minRefreshIntervalMs?: number;
    retryDelayMs?: number;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
export declare function startBackgroundTokenRefresh(appId: string, clientSecret: string, options?: BackgroundTokenRefreshOptions): void;
/**
 * 停止后台 Token 刷新
 * @param appId 选填。如果有，仅停止该账号的定时刷新。
 */
export declare function stopBackgroundTokenRefresh(appId?: string): void;
export declare function isBackgroundTokenRefreshRunning(appId?: string): boolean;
import type { StreamMessageRequest } from "./types.js";
/**
 * 发送流式消息（C2C 私聊）
 *
 * 流式协议：
 * - 首次调用时不传 stream_msg_id，由平台返回
 * - 后续分片携带 stream_msg_id 和递增 msg_seq
 * - input_state="1" 表示生成中，"10" 表示生成结束（终结状态）
 *
 * 仅在终结分片（input_state=DONE）时触发 refIdx 回调，
 * 中间分片直接调用 apiRequest，避免存入过多无效的中间态数据。
 *
 * @param accessToken - access_token
 * @param openid - 用户 openid
 * @param req - 流式消息请求体
 * @returns 消息响应（复用 MessageResponse，错误会直接抛出异常）
 */
export declare function sendC2CStreamMessage(accessToken: string, openid: string, req: StreamMessageRequest): Promise<MessageResponse>;
export {};
