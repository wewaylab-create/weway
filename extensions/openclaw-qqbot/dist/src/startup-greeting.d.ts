/**
 * 启动问候语系统：首次安装/版本更新 vs 普通重启
 */
export declare function getFirstLaunchGreetingText(): string;
export declare function getUpgradeGreetingText(version: string): string;
export type StartupMarkerData = {
    version?: string;
    startedAt?: string;
    greetedAt?: string;
    lastFailureAt?: string;
    lastFailureReason?: string;
    lastFailureVersion?: string;
};
export declare function readStartupMarker(accountId: string, appId: string): StartupMarkerData;
export declare function writeStartupMarker(accountId: string, appId: string, data: StartupMarkerData): void;
/**
 * 判断是否需要发送启动问候：
 * - 首次启动（无 marker）→ "灵魂已上线"
 * - 版本变更 → "已更新至 vX.Y.Z"
 * - 同版本 → 不发送
 * - 同版本近期失败 → 冷却期内不重试
 */
export declare function getStartupGreetingPlan(accountId: string, appId: string): {
    shouldSend: boolean;
    greeting?: string;
    version: string;
    reason?: string;
};
export declare function markStartupGreetingSent(accountId: string, appId: string, version: string): void;
export declare function markStartupGreetingFailed(accountId: string, appId: string, version: string, reason: string): void;
