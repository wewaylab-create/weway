/**
 * 版本检查器
 *
 * - triggerUpdateCheck(): gateway 启动时调用，后台预热缓存
 * - getUpdateInfo(): 每次实时查询 npm registry，返回最新结果
 *
 * 使用 HTTPS 直接请求 npm registry API（不依赖 npm CLI），
 * 支持多 registry fallback：npmjs.org → npmmirror.com，解决国内网络问题。
 */
export interface UpdateInfo {
    current: string;
    /** 最佳升级目标（prerelease 用户优先 alpha，稳定版用户取 latest） */
    latest: string | null;
    /** 稳定版 dist-tag */
    stable: string | null;
    /** alpha dist-tag */
    alpha: string | null;
    hasUpdate: boolean;
    checkedAt: number;
    error?: string;
}
/** gateway 启动时调用，保存 log 引用 */
export declare function triggerUpdateCheck(log?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug?: (msg: string) => void;
}): void;
/** 每次实时查询 npm registry */
export declare function getUpdateInfo(): Promise<UpdateInfo>;
/**
 * 检查指定版本是否存在于 npm registry
 * 用于 /bot-upgrade --version 的前置校验
 * @param version 要检查的版本号
 * @param pkgName 可选的包名（如 "@ryantest/openclaw-qqbot"），默认使用内置包名
 */
export declare function checkVersionExists(version: string, pkgName?: string): Promise<boolean>;
