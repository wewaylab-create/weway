/**
 * 出站消息合并回复（Deliver Debounce）模块
 *
 * 解决的问题：
 * 当 openclaw 框架层的 embedded agent 超时或快速连续产生多次 deliver 时，
 * 用户会在短时间内收到大量碎片消息（消息轰炸）。
 *
 * 解决方案：
 * 在 deliver 回调和实际发送之间加入 debounce 层。
 * 短时间内（windowMs）连续到达的多条纯文本 deliver 会被合并为一条消息发送。
 * 含媒体的 deliver 会立即 flush 已缓冲的文本并正常处理媒体。
 */
import type { DeliverDebounceConfig } from "./types.js";
export interface DeliverPayload {
    text?: string;
    mediaUrls?: string[];
    mediaUrl?: string;
}
export interface DeliverInfo {
    kind: string;
}
/** 实际执行发送的回调 */
export type DeliverExecutor = (payload: DeliverPayload, info: DeliverInfo) => Promise<void>;
export declare class DeliverDebouncer {
    private readonly windowMs;
    private readonly maxWaitMs;
    private readonly separator;
    private readonly executor;
    private readonly log?;
    private readonly prefix;
    /** 缓冲中的文本片段 */
    private bufferedTexts;
    /** 缓冲中最后一次 deliver 的 info（用于 flush 时传递 kind） */
    private lastInfo;
    /** 缓冲中最后一次 deliver 的 payload（非文本字段，如 mediaUrls） */
    private lastPayload;
    /** debounce 定时器 */
    private debounceTimer;
    /** 最大等待定时器（从第一条 deliver 开始计算） */
    private maxWaitTimer;
    /** 是否正在 flush */
    private flushing;
    /** 已销毁标记 */
    private disposed;
    constructor(config: DeliverDebounceConfig | undefined, executor: DeliverExecutor, log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
    }, prefix?: string);
    /**
     * 接收一次 deliver 调用。
     * - 纯文本 deliver → 缓冲并设置 debounce 定时器
     * - 含媒体 deliver → 先 flush 已缓冲文本，再直接执行当前 deliver
     */
    deliver(payload: DeliverPayload, info: DeliverInfo): Promise<void>;
    /**
     * 将缓冲中的文本合并为一条消息发送
     */
    flush(): Promise<void>;
    /**
     * 销毁：flush 剩余缓冲并清除定时器
     */
    dispose(): Promise<void>;
    /** 当前是否有缓冲中的文本 */
    get hasPending(): boolean;
    /** 缓冲中的文本数量 */
    get pendingCount(): number;
}
/**
 * 根据配置创建 debouncer 或返回 null（禁用时）
 */
export declare function createDeliverDebouncer(config: DeliverDebounceConfig | undefined, executor: DeliverExecutor, log?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
}, prefix?: string): DeliverDebouncer | null;
