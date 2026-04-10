import type { ResolvedQQBotAccount } from "./types.js";
export interface MessageTarget {
    type: "c2c" | "guild" | "dm" | "group";
    senderId: string;
    messageId: string;
    channelId?: string;
    groupOpenid?: string;
}
export interface ReplyContext {
    target: MessageTarget;
    account: ResolvedQQBotAccount;
    cfg: unknown;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
/**
 * 带 token 过期重试的消息发送
 */
export declare function sendWithTokenRetry<T>(appId: string, clientSecret: string, sendFn: (token: string) => Promise<T>, log?: ReplyContext["log"], accountId?: string): Promise<T>;
/**
 * 根据消息类型路由发送文本
 */
export declare function sendTextToTarget(ctx: ReplyContext, text: string, refIdx?: string): Promise<void>;
/**
 * 发送错误提示给用户
 */
export declare function sendErrorToTarget(ctx: ReplyContext, errorText: string): Promise<void>;
/**
 * 处理结构化载荷（QQBOT_PAYLOAD: 前缀的 JSON）
 * 返回 true 表示已处理，false 表示不是结构化载荷
 */
export declare function handleStructuredPayload(ctx: ReplyContext, replyText: string, recordActivity: () => void): Promise<boolean>;
