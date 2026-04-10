/**
 * QQBot Approval Handler
 *
 * 监听 Gateway 的 exec/plugin approval 事件，
 * 直接调用 QQ API 发送带 Inline Keyboard 的审批消息。
 * 参考 DiscordExecApprovalHandler 的实现模式。
 *
 * 兼容性：gateway-runtime / approval-runtime 模块在 openclaw < 3.22 上不存在，
 * 使用动态 import 避免插件整体加载失败，旧版框架上审批功能自动降级（不可用）。
 */
import type { OpenClawConfig } from "openclaw/plugin-sdk";
export interface QQBotApprovalHandlerOpts {
    accountId: string;
    appId: string;
    clientSecret: string;
    cfg: OpenClawConfig;
    gatewayUrl?: string;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
export declare class QQBotApprovalHandler {
    private gatewayClient;
    private pending;
    private requestCache;
    private opts;
    private started;
    constructor(opts: QQBotApprovalHandlerOpts);
    start(): Promise<void>;
    stop(): Promise<void>;
    /** 检查是否有指定 shortId 对应的 pending 审批 */
    hasShortId(shortId: string): boolean;
    /** 解析审批请求（供 Interaction 回调或 /approve 命令调用） */
    resolveApproval(approvalId: string, decision: "allow-once" | "allow-always" | "deny"): Promise<boolean>;
    private handleGatewayEvent;
    private handleRequested;
    private handleResolved;
    private handleTimeout;
}
export declare function isApprovalFeatureAvailable(): boolean;
export declare function setApprovalFeatureAvailable(available: boolean): void;
export declare function registerApprovalHandler(accountId: string, handler: QQBotApprovalHandler): void;
export declare function unregisterApprovalHandler(accountId: string): void;
export declare function getApprovalHandler(accountId: string): QQBotApprovalHandler | undefined;
export declare function findApprovalHandlerForShortId(shortId: string): QQBotApprovalHandler | undefined;
