import type { QueueSnapshot } from "./slash-commands.js";
import type { MsgElement } from "./types.js";
/**
 * 消息队列项类型（用于异步处理消息，防止阻塞心跳）
 */
export interface QueuedMessage {
    type: "c2c" | "guild" | "dm" | "group";
    senderId: string;
    senderName?: string;
    content: string;
    messageId: string;
    timestamp: string;
    channelId?: string;
    guildId?: string;
    groupOpenid?: string;
    attachments?: Array<{
        content_type: string;
        url: string;
        filename?: string;
        voice_wav_url?: string;
        asr_refer_text?: string;
    }>;
    /** 被引用消息的 refIdx（用户引用了哪条历史消息） */
    refMsgIdx?: string;
    /** 当前消息自身的 refIdx（供将来被引用） */
    msgIdx?: string;
    /** 事件类型（如 GROUP_AT_MESSAGE_CREATE），用于群消息合并时判断是否有 @ */
    eventType?: string;
    /** 发送者是否为机器人 */
    senderIsBot?: boolean;
    /** @ 提及列表（群消息合并时需要去重合并） */
    mentions?: Array<{
        scope?: "all" | "single";
        id?: string;
        user_openid?: string;
        member_openid?: string;
        username?: string;
        bot?: boolean;
        is_you?: boolean;
    }>;
    /** 消息场景（来源、扩展字段） */
    messageScene?: {
        source?: string;
        ext?: string[];
    };
    /** 消息元素列表，引用消息时 [0] 为被引用的原始消息 */
    msgElements?: MsgElement[];
    /** 消息类型，参见 MSG_TYPE_* */
    msgType?: number;
    /** 群消息合并标记：记录合并了多少条原始消息 */
    _mergedCount?: number;
    /** 合并前的原始消息列表（用于 gateway 侧逐条格式化信封） */
    _mergedMessages?: QueuedMessage[];
}
export interface MessageQueueContext {
    accountId: string;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
    /** 外部提供的 abort 状态检查 */
    isAborted: () => boolean;
    /** 群聊队列上限（默认 50） */
    groupQueueSize?: number;
    /** 私聊/DM 队列上限（默认 20） */
    peerQueueSize?: number;
    /** 全局队列总量上限（默认 1000） */
    globalQueueSize?: number;
    /** 最大并发处理用户数（默认 10） */
    maxConcurrentUsers?: number;
}
export interface MessageQueue {
    enqueue: (msg: QueuedMessage) => void;
    startProcessor: (handleMessageFn: (msg: QueuedMessage) => Promise<void>) => void;
    getSnapshot: (senderPeerId: string) => QueueSnapshot;
    getMessagePeerId: (msg: QueuedMessage) => string;
    /** 清空指定用户的排队消息，返回被丢弃的消息数 */
    clearUserQueue: (peerId: string) => number;
    /** 立即执行一条消息（绕过队列），用于紧急命令 */
    executeImmediate: (msg: QueuedMessage) => void;
}
/**
 * 创建按用户并发的消息队列（同用户串行，跨用户并行）
 *
 * 内置群消息增强：
 * - 群聊 / 私聊使用不同队列上限
 * - 群聊溢出时优先丢弃 bot 消息
 * - drain 时自动合并群聊排队消息（斜杠命令单独处理）
 */
export declare function createMessageQueue(ctx: MessageQueueContext): MessageQueue;
