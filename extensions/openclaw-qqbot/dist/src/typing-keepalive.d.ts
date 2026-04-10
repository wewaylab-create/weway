/**
 * 输入状态自动续期
 * 在消息处理期间定时续发 "正在输入" 状态通知，确保用户持续看到 bot 在处理中。
 * 仅 C2C 私聊有效（QQ 群聊 API 不支持输入状态通知）。
 */
export declare const TYPING_INTERVAL_MS = 50000;
export declare const TYPING_INPUT_SECOND = 60;
export declare class TypingKeepAlive {
    private readonly getToken;
    private readonly clearCache;
    private readonly openid;
    private readonly msgId;
    private readonly log?;
    private readonly logPrefix;
    private timer;
    private stopped;
    constructor(getToken: () => Promise<string>, clearCache: () => void, openid: string, msgId: string | undefined, log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    } | undefined, logPrefix?: string);
    /** 启动定时续期（首次发送由调用方自行处理，这里只负责后续续期） */
    start(): void;
    /** 停止续期 */
    stop(): void;
    private send;
}
