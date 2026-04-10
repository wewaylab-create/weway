/**
 * QQ Bot 流式消息控制器（简化版）
 *
 * 核心原则：
 * 1. 绝对不修改原始内容（不 trim、不 strip），避免 PREFIX MISMATCH
 * 2. 媒体标签同步等待发送完成
 * 3. 碰到富媒体标签（包括未闭合前缀）时，先终结当前流式会话再处理
 * 4. 纯空白分片处理：
 *    - 首分片空白 → 暂停发送（不开启流式），但内容保留
 *    - 被媒体标签打断或结束时，如果还都是空白 → 不发送
 *    - 结束时已有活跃流式会话（之前有非空白分片）→ 可以发送当前空白分片
 * 5. 回复边界检测：通过前缀匹配判断（而非仅长度缩短），
 *    如果新文本不是上次处理文本的前缀延续，视为新消息
 */
import type { ResolvedQQBotAccount } from "./types.js";
/** 流式状态机阶段 */
type StreamingPhase = "idle" | "streaming" | "completed" | "aborted";
/** StreamingController 的依赖注入 */
export interface StreamingControllerDeps {
    /** QQ Bot 账户配置 */
    account: ResolvedQQBotAccount;
    /** 目标用户 openid（流式 API 仅支持 C2C） */
    userId: string;
    /** 被动回复的消息 ID */
    replyToMsgId: string;
    /** 事件 ID */
    eventId: string;
    /** 日志前缀 */
    logPrefix?: string;
    /** 日志对象（直接传 gateway 的 log） */
    log?: {
        info(msg: string): void;
        error(msg: string): void;
        warn?(msg: string): void;
        debug?(msg: string): void;
    };
    /**
     * 媒体发送上下文（用于在流式模式下发送富媒体）
     * 如果不提供，遇到媒体标签时会抛出错误导致 fallback
     */
    mediaContext?: StreamingMediaContext;
}
/**
 * QQ Bot 流式消息控制器
 *
 * 管理 C2C 流式消息的完整生命周期：
 * 1. idle: 初始状态，等待首次文本
 * 2. streaming: 流式发送中，通过 API 逐步更新消息内容
 * 3. completed: 正常完成，已发送 input_state="10"
 * 4. aborted: 中止（进程退出/错误）
 *
 * 富媒体标签处理流程：
 * 当检测到富媒体标签时：
 * 1. 将标签前的文本通过流式发完 → 结束当前流式会话 (input_state="10")
 * 2. 同步等待媒体发送完成
 * 3. 创建新的流式会话 → 继续发送标签后的剩余文本
 */
export declare class StreamingController {
    private phase;
    /**
     * 最后一次收到的完整 normalized 全量文本。
     * - onPartialReply 每次更新（回复边界时会拼接前缀）
     * - performFlush 从 sentIndex 开始切片来获取当前会话的显示内容
     * - onIdle 校验时用于前缀匹配
     */
    private lastNormalizedFull;
    /**
     * 最后一次收到的完整原始文本（未经 normalize）。
     * 仅用于回复边界检测——原始文本在 partial reply 过程中是稳定递增的，
     * 不会因为 normalizeMediaTags 对未闭合标签的处理差异导致前缀不匹配。
     */
    private lastRawFull;
    /**
     * 边界拼接前缀：检测到新回复时，将之前的全部内容 + "\n\n" 存为前缀。
     * 后续回调传入的 text 都会自动加上此前缀来还原完整文本。
     * 为 null 表示当前没有发生过边界拼接。
     */
    private _boundaryPrefix;
    /**
     * 在 lastNormalizedFull 中已经"消费"到的位置。
     * "消费"包括：已通过流式发送并终结的文本段、已处理的媒体标签。
     * - 每次流式会话终结（endCurrentStreamIfNeeded）后推进到终结点
     * - 每次媒体标签处理后推进到标签结束位置
     * - resetStreamSession 后，新的流式会话从 sentIndex 开始
     */
    private sentIndex;
    private streamMsgId;
    /** 当前流式会话的 msg_seq，同一会话内所有 chunk 共享；null 表示需要重新生成 */
    private msgSeq;
    private streamIndex;
    private dispatchFullyComplete;
    /** Promise 链，回调的实际逻辑都挂到链尾，保证串行 */
    private _callbackChain;
    /**
     * 记录首先到达的回调来源，后续其他来源的回调将被忽略。
     * - null: 尚未确定
     * - 非 null: 已锁定，只有相同来源的回调才允许继续执行
     */
    private firstCallbackSource;
    /**
     * 尝试获取回调互斥锁。
     * - 尚未锁定 → 锁定为 source，返回 true
     * - 已锁定且来源相同 → 返回 true
     * - 已锁定且来源不同 → 返回 false（调用方应跳过）
     */
    private acquireCallbackLock;
    /** 成功发送的流式分片数或媒体数（用于 onDeliver 互斥判断 + 降级判断） */
    private sentStreamChunkCount;
    /** 是否成功发送过至少一个媒体文件 */
    private sentMediaCount;
    private startingPromise;
    private flush;
    private throttleMs;
    private deps;
    constructor(deps: StreamingControllerDeps);
    get isTerminalPhase(): boolean;
    get currentPhase(): StreamingPhase;
    /**
     * 是否应降级到非流式（普通消息）发送
     *
     * 条件：流式会话进入终态，且从未成功发出过任何一个流式分片或媒体
     */
    get shouldFallbackToStatic(): boolean;
    /** debug 用：暴露发送计数给 gateway 日志 */
    get sentChunkCount_debug(): number;
    private transition;
    private onEnterTerminalPhase;
    private get prefix();
    private logInfo;
    private logError;
    private logWarn;
    private logDebug;
    /**
     * 处理 onPartialReply 回调（流式文本全量更新）
     *
     * ★ 通过 Promise 链严格串行化：前一次处理完成后才执行下一次，
     *   避免并发交叉导致的状态不一致。
     *
     * payload.text 是从头到尾的完整当前文本（每次回调都是全量）。
     * 核心逻辑：normalize → 更新 lastNormalizedFull → 从 sentIndex 开始 processMediaTags
     */
    onPartialReply(payload: {
        text?: string;
    }): Promise<void>;
    /** onPartialReply 的实际逻辑（由 _callbackChain 保证串行调用） */
    private _doPartialReply;
    /**
     * 处理 deliver 回调
     *
     * ★ 与 onPartialReply 互斥：首先到达的回调锁定控制权，后到的被忽略。
     */
    onDeliver(payload: {
        text?: string;
    }): Promise<void>;
    /**
     * 处理 onIdle 回调（分发完成时调用）
     *
     * ★ 挂到 _callbackChain 上，保证在所有 onPartialReply 执行完之后才执行。
     *
     * onIdle 会传入最终的全量文本。如果该文本**包含**之前存储的 lastNormalizedFull，
     * 说明一致，继续处理剩余内容；否则忽略（防止 onIdle 修改文本导致的不一致）。
     */
    onIdle(payload?: {
        text?: string;
    }): Promise<void>;
    /** onIdle 的实际逻辑（由 _callbackChain 保证在 onPartialReply 之后执行） */
    private _doIdle;
    /**
     * onIdle 的终结逻辑：终结流式会话或标记完成/降级
     */
    private finalizeOnIdle;
    /**
     * 处理错误
     */
    onError(err: unknown): Promise<void>;
    /** 标记分发已全部完成 */
    markFullyComplete(): void;
    /** 中止流式消息 */
    abortStreaming(): Promise<void>;
    /**
     * 处理富媒体标签（循环消费模型）
     *
     * 从 sentIndex 开始，对增量文本：
     * 1. 优先找闭合标签 → 终结当前流式 → 同步发媒体 → 推进 sentIndex → reset → 继续
     * 2. 没有闭合标签但有未闭合前缀 → 标签前的安全文本仍需通过流式发送 → 推进 sentIndex → 等待标签闭合
     * 3. 纯文本 → 触发流式发送（performFlush 会动态计算要发的内容）
     */
    private processMediaTags;
    /**
     * 终结当前流式会话（如果有的话）
     *
     * @param caller 调用者标识（日志用）
     * @param textEndInFull 本次终结需要发送到的全量文本位置（不含）。
     *   终结分片的内容 = lastNormalizedFull.slice(sentIndex, textEndInFull)
     *
     * 逻辑：
     * - 有活跃 streamMsgId → 等待 flush 完成 → 发 DONE 分片终结
     * - 没有 streamMsgId 但有非空白文本 → 启动流式 → 立即终结
     * - 纯空白且无活跃流式 → 不发送
     */
    private endCurrentStreamIfNeeded;
    /** 临时存储 endCurrentStreamIfNeeded 需要立即发送的文本（用于 doStartStreaming） */
    private _pendingSessionText;
    /**
     * 重置流式会话状态（用于媒体中断后恢复）
     *
     * 只重置会话相关状态，不重置 sentIndex 和 dispatch 标记。
     * 新流式会话从当前 sentIndex 开始（performFlush 动态计算内容）。
     */
    private resetStreamSession;
    /** 确保流式会话已开始（首次调用创建；并发调用者会等待首次完成） */
    private ensureStreamingStarted;
    /** 实际执行流式启动逻辑 */
    private doStartStreaming;
    /** 发送一个流式分片（不做任何文本修改） */
    private sendStreamChunk;
    /** 执行一次实际的流式内容更新 */
    private performFlush;
}
/** 流式媒体发送上下文（由 gateway 注入到 StreamingController） */
export interface StreamingMediaContext {
    /** 账户信息 */
    account: ResolvedQQBotAccount;
    /** 事件信息 */
    event: {
        type: "c2c" | "group" | "channel";
        senderId: string;
        messageId: string;
        groupOpenid?: string;
        channelId?: string;
    };
    /** 日志 */
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
/**
 * 判断是否应该对当前消息使用流式模式
 *
 * 条件：
 * 1. 账户配置 streaming 未显式设为 false（默认启用）
 * 2. 目标类型为 c2c（私聊）—— 流式 API 仅支持 C2C
 */
export declare function shouldUseStreaming(account: ResolvedQQBotAccount, targetType: "c2c" | "group" | "channel"): boolean;
export {};
