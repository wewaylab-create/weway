/**
 * 凭证暂存与恢复
 *
 * 解决热更新被打断时 openclaw.json 中 appId/secret 丢失的问题。
 *
 * 原理：
 *   - 每次 gateway 成功启动后，把当前账户的 appId/secret 写入暂存文件
 *   - 插件启动时如果检测到配置中 appId/secret 为空，尝试从暂存文件恢复
 *   - 暂存文件存储在 ~/.openclaw/qqbot/data/ 下，不受插件目录替换影响
 *
 * 安全保障：
 *   - 只在 appId/secret **确实为空** 时才尝试恢复（不干扰正常配置变更）
 *   - 恢复后通过 openclaw 的 config API 写回配置文件，确保框架感知到变更
 *   - 暂存文件使用原子写入（先写 .tmp 再 rename）防止损坏
 */
interface CredentialBackup {
    accountId: string;
    appId: string;
    clientSecret: string;
    savedAt: string;
}
/**
 * 保存凭证快照到暂存文件（gateway 成功启动后调用）
 */
export declare function saveCredentialBackup(accountId: string, appId: string, clientSecret: string): void;
/**
 * 从暂存文件读取凭证（仅在配置为空时调用）
 * 返回 null 表示无可用备份
 */
export declare function loadCredentialBackup(accountId?: string): CredentialBackup | null;
export {};
