/**
 * 富媒体标签解析与发送队列
 *
 * 提供媒体标签（qqimg / qqvoice / qqvideo / qqfile / qqmedia）的检测、
 * 拆分、路径编码修复，以及统一的发送队列执行器。
 */
import { type MediaTargetContext } from "../outbound.js";
import type { ResolvedQQBotAccount } from "../types.js";
/** 发送队列项 */
export interface SendQueueItem {
    type: "text" | "image" | "voice" | "video" | "file" | "media";
    content: string;
}
/** 统一的媒体标签正则 — 匹配标准化后的 6 种标签 */
export declare const MEDIA_TAG_REGEX: RegExp;
/** 创建一个新的全局标签正则实例（每次调用 reset lastIndex） */
export declare function createMediaTagRegex(): RegExp;
/** 媒体发送上下文（统一的，供流式和普通模式共用） */
export interface MediaSendContext {
    /** 媒体目标上下文（用于 sendPhoto/sendVoice 等） */
    mediaTarget: MediaTargetContext;
    /** qualifiedTarget（格式 "qqbot:c2c:xxx" 或 "qqbot:group:xxx"，用于 sendMediaAuto） */
    qualifiedTarget: string;
    /** 账户配置 */
    account: ResolvedQQBotAccount;
    /** 事件消息 ID（用于被动回复） */
    replyToId?: string;
    /** 日志 */
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
/**
 * 修复路径编码问题（双反斜杠、八进制转义、UTF-8 双重编码）
 *
 * 这是由于 LLM 输出路径时可能引入的编码问题：
 * - Markdown 转义导致双反斜杠
 * - 八进制转义序列（来自某些 shell 工具的输出）
 * - UTF-8 双重编码（中文路径经过多层处理后的乱码）
 *
 * 此方法在 gateway.ts deliver 回调、outbound.ts sendText、
 * streaming.ts sendMediaQueue 中共用。
 */
export declare function fixPathEncoding(mediaPath: string, log?: {
    debug?: (msg: string) => void;
    error?: (msg: string) => void;
}): string;
/**
 * 判断文本中给定位置是否处于围栏代码块内（``` 块）。
 *
 * 围栏代码块：行首 ``` 开始，到下一个行首 ``` 结束（或文本末尾）
 *
 * @param text 完整文本
 * @param position 要检测的位置（字符索引）
 * @returns 如果 position 在围栏代码块内返回 true
 */
export declare function isInsideCodeBlock(text: string, position: number): boolean;
/**
 * 检测文本是否包含富媒体标签（忽略代码块内的标签）
 */
export declare function hasMediaTags(text: string): boolean;
/** findFirstClosedMediaTag 的返回值 */
export interface FirstClosedMediaTag {
    /** 标签前的纯文本 */
    textBefore: string;
    /** 标签类型（小写，如 "qqvoice"） */
    tagName: string;
    /** 标签内的媒体路径（已 trim、去 MEDIA: 前缀、修复编码） */
    mediaPath: string;
    /** 标签在输入文本中的结束索引（紧接标签后的第一个字符位置） */
    tagEndIndex: number;
    /** 映射后的发送队列项类型 */
    itemType: SendQueueItem["type"];
}
/**
 * 在文本中查找**第一个**完整闭合的媒体标签
 *
 * 与 splitByMediaTags 不同，此函数只匹配一个标签就停止，
 * 用于流式场景的"循环消费"模式：每次处理一个标签，更新偏移，再找下一个。
 *
 * @param text 待检查的文本（应已 normalize 过）
 * @returns 第一个闭合标签的信息，没有则返回 null
 */
export declare function findFirstClosedMediaTag(text: string, log?: {
    info?: (msg: string) => void;
    debug?: (msg: string) => void;
    error?: (msg: string) => void;
}): FirstClosedMediaTag | null;
/**
 * 媒体标签拆分结果
 */
export interface MediaSplitResult {
    /** 是否包含媒体标签 */
    hasMediaTags: boolean;
    /** 媒体标签前的纯文本 */
    textBeforeFirstTag: string;
    /** 媒体标签后的剩余文本 */
    textAfterLastTag: string;
    /** 完整的发送队列（标签间的文本 + 媒体项） */
    mediaQueue: SendQueueItem[];
}
/**
 * 将文本按富媒体标签拆分为三部分
 *
 * 用于两个场景：
 * 1. 流式模式：中断-恢复流程（标签前文本 → 结束流式 → 发送媒体 → 新流式 → 标签后文本）
 * 2. 普通模式：构建按顺序发送的队列
 */
export declare function splitByMediaTags(text: string, log?: {
    info?: (msg: string) => void;
    debug?: (msg: string) => void;
    error?: (msg: string) => void;
}): MediaSplitResult;
/**
 * 从文本中解析出完整的发送队列（含标签前后的纯文本）
 *
 * 与 splitByMediaTags 的区别：
 * - splitByMediaTags 分为 before / queue / after 三段（供流式模式的中断-恢复）
 * - parseMediaTagsToSendQueue 返回一个扁平的完整队列（供普通模式按顺序发送）
 *
 * 适用于 gateway.ts deliver 回调和 outbound.ts sendText。
 */
export declare function parseMediaTagsToSendQueue(text: string, log?: {
    info?: (msg: string) => void;
    debug?: (msg: string) => void;
    error?: (msg: string) => void;
}): {
    hasMediaTags: boolean;
    sendQueue: SendQueueItem[];
};
/**
 * 统一执行发送队列
 *
 * 遍历 sendQueue，按类型调用对应的发送函数。
 * 文本项通过 onSendText 回调处理（不同场景的文本发送方式不同）。
 * 媒体发送失败时，通过 onSendText 发送兜底文本通知用户。
 */
export declare function executeSendQueue(queue: SendQueueItem[], ctx: MediaSendContext, options?: {
    /** 文本发送回调（每种场景的文本发送方式不同） */
    onSendText?: (text: string) => Promise<void>;
    /** 是否跳过 inter-tag 文本（流式模式下通常跳过，由新流式会话处理） */
    skipInterTagText?: boolean;
}): Promise<void>;
/**
 * 从文本中剥离所有媒体标签（用于最终显示）
 */
export declare function stripMediaTags(text: string): string;
/**
 * 检测文本中是否有未闭合的媒体标签，如果有则截断到安全位置。
 *
 * 流式输出中 LLM 逐 token 吐出媒体标签，中间态不应直接发给用户。
 * 只检查最后一行，从右到左扫描 `<`，找到第一个有意义的媒体标签片段并判断是否完整。
 *
 * 核心原则：截断只能截到**开标签**前面；闭合标签前缀若找不到对应开标签则原样返回。
 */
export declare function stripIncompleteMediaTag(text: string): [safeText: string, hasIncomplete: boolean];
