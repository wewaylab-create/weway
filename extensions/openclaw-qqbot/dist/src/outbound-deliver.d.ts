/**
 * 出站消息投递模块
 *
 * 从 gateway deliver 回调中提取的两大发送管线：
 * 1. parseAndSendMediaTags — 解析 <qqimg/qqvoice/qqvideo/qqfile/qqmedia> 标签并按顺序发送
 * 2. sendPlainReply — 处理不含媒体标签的普通回复（markdown 图片/纯文本+图片）
 */
import type { ResolvedQQBotAccount } from "./types.js";
export interface DeliverEventContext {
    type: "c2c" | "guild" | "dm" | "group";
    senderId: string;
    messageId: string;
    channelId?: string;
    groupOpenid?: string;
    msgIdx?: string;
}
export interface DeliverAccountContext {
    account: ResolvedQQBotAccount;
    qualifiedTarget: string;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
/** token 重试包装 */
export type SendWithRetryFn = <T>(sendFn: (token: string) => Promise<T>) => Promise<T>;
/** 一次性消费引用 ref */
export type ConsumeQuoteRefFn = () => string | undefined;
/**
 * 解析回复文本中的媒体标签并按顺序发送。
 *
 * @returns true 如果检测到媒体标签并已处理；false 表示无媒体标签，调用方继续走普通文本管线
 */
export declare function parseAndSendMediaTags(replyText: string, event: DeliverEventContext, actx: DeliverAccountContext, sendWithRetry: SendWithRetryFn, consumeQuoteRef: ConsumeQuoteRefFn): Promise<{
    handled: boolean;
    normalizedText: string;
}>;
export interface PlainReplyPayload {
    text?: string;
    mediaUrls?: string[];
    mediaUrl?: string;
}
/**
 * 发送不含媒体标签的普通回复。
 * 处理 markdown 图片嵌入、Base64 富媒体、纯文本分块、本地媒体自动路由。
 */
export declare function sendPlainReply(payload: PlainReplyPayload, replyText: string, event: DeliverEventContext, actx: DeliverAccountContext, sendWithRetry: SendWithRetryFn, consumeQuoteRef: ConsumeQuoteRefFn, toolMediaUrls: string[]): Promise<void>;
