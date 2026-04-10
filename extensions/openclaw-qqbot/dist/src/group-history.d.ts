/**
 * 群历史消息缓存
 *
 * 非@消息写入内存 Map，被@时一次性注入上下文后清空。
 * 自包含实现，不依赖 openclaw/plugin-sdk。
 */
/**
 * 附件摘要（统一格式）
 *
 * 兼容 ref-index-store 的 RefAttachmentSummary、群历史缓存、以及 gateway 当前消息动态上下文。
 * 所有场景的附件描述都通过 formatAttachmentTags() 统一格式化，确保标签风格一致。
 */
export interface AttachmentSummary {
    /** 附件类型 */
    type: "image" | "voice" | "video" | "file" | "unknown";
    /** 文件名（如有） */
    filename?: string;
    /** 语音转录文本（入站：STT/ASR识别结果；出站：TTS原文本） */
    transcript?: string;
    /** 语音转录来源：stt=本地STT、asr=平台ASR、tts=TTS原文本、fallback=兜底文案 */
    transcriptSource?: "stt" | "asr" | "tts" | "fallback";
    /** 已下载到本地的文件路径 */
    localPath?: string;
    /** 在线来源 URL（公网图片/文件等） */
    url?: string;
}
/**
 * QQ 事件原始附件（来自 gateway 事件的通用字段子集）
 *
 * 多处需要将原始附件转换为 AttachmentSummary，统一此类型避免内联重复定义。
 */
export interface RawAttachment {
    content_type: string;
    filename?: string;
    /** 语音 ASR 识别文本（QQ 事件内置） */
    asr_refer_text?: string;
    /** 附件 URL */
    url?: string;
}
/**
 * 根据 content_type 推断附件类型（统一判断逻辑，避免多处重复）
 */
export declare function inferAttachmentType(contentType?: string): AttachmentSummary["type"];
/**
 * 将原始附件数组转换为 AttachmentSummary 数组。
 *
 * 统一"原始附件 → 摘要"的映射逻辑，供历史记录缓存、合并消息格式化等场景复用。
 * 无附件时返回 undefined（而非空数组），与 HistoryEntry.attachments 的可选语义一致。
 */
export declare function toAttachmentSummaries(attachments?: RawAttachment[]): AttachmentSummary[] | undefined;
/** @deprecated 使用 AttachmentSummary 代替 */
export type HistoryAttachment = AttachmentSummary;
export interface HistoryEntry {
    sender: string;
    body: string;
    timestamp?: number;
    messageId?: string;
    /** 富媒体附件摘要（图片/语音/视频/文件） */
    attachments?: AttachmentSummary[];
}
/** formatMessageContent 入参 */
export interface FormatMessageContentParams {
    content: string;
    /** 消息类型（group 时才做 mention 清理） */
    chatType?: string;
    mentions?: unknown[];
    attachments?: RawAttachment[];
    /** QQ 表情标签解析（<faceType=...> → 【表情: 中文名】） */
    parseFaceTags: (text: string) => string;
    /** mention @ 清理（移除 <@member_openid> 标记） */
    stripMentionText?: (text: string, mentions: unknown[]) => string;
}
/**
 * 格式化单条消息内容：表情标签解析 → mention 清理 → 附件标签拼接。
 *
 * 用于合并消息的逐条子消息格式化，将外部依赖（parseFaceTags / stripMentionText）
 * 通过参数注入，保持本模块自包含。
 */
export declare function formatMessageContent(params: FormatMessageContentParams): string;
/**
 * 将附件摘要格式化为统一的人类可读标签描述（供 AI 上下文注入）。
 *
 * 标签风格沿用框架的 MEDIA: 标签格式：
 *   有路径的附件  → MEDIA:path
 *   语音+转录    → MEDIA:path （内容: "transcript"）
 *   无路径的语音  → [语音消息（内容: "transcript"）]
 *   无路径无转录  → [图片] / [语音消息] / [视频] / [文件]
 *
 * 此函数是所有附件描述的 **唯一格式化入口**，确保引用消息、群历史缓存、
 * 当前消息动态上下文三处标签风格完全一致。
 */
export declare function formatAttachmentTags(attachments?: AttachmentSummary[]): string;
/** @deprecated 使用 formatAttachmentTags 代替 */
export declare const formatHistoryAttachments: typeof formatAttachmentTags;
/**
 * 记录一条待注入的历史消息（非@消息调用此函数）。
 * limit <= 0 或 entry 为空时不记录。
 */
export declare function recordPendingHistoryEntry(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    entry?: HistoryEntry | null;
    limit: number;
}): HistoryEntry[];
/**
 * 构建包含历史上下文的完整消息体（被@时调用）。
 * 如果没有累积的历史消息，直接返回 currentMessage 原文。
 */
export declare function buildPendingHistoryContext(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    limit: number;
    currentMessage: string;
    formatEntry: (entry: HistoryEntry) => string;
    lineBreak?: string;
}): string;
/**
 * 构建合并消息上下文（多条排队消息被合并时调用）。
 * 前置消息用 [合并消息开始]...[合并消息结束] 段落标签包裹，
 * 最后一条作为当前消息紧跟其后。
 * 如果只有一条消息，直接返回 currentMessage 原文。
 */
export declare function buildMergedMessageContext(params: {
    precedingParts: string[];
    currentMessage: string;
    lineBreak?: string;
}): string;
/**
 * 清空指定群的历史缓存（回复完成后调用）。
 * limit <= 0 表示功能已禁用，不做操作。
 */
export declare function clearPendingHistory(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    limit: number;
}): void;
