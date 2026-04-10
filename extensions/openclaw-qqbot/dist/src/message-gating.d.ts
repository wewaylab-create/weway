/**
 * 群消息门控 — 统一入口。
 *
 * 将 ignoreOtherMentions / shouldBlock / mentionGating 三层判断收敛到
 * 一个纯函数 resolveGroupMessageGate() 中，让 gateway 主流程只关心一个结果。
 *
 * 按优先级串行检查：
 *   1. ignoreOtherMentions — @了其他人但未 @bot → 丢弃（记历史）
 *   2. shouldBlock         — 未授权控制命令静默拦截
 *   3. mentionGating       — requireMention 门控 + 命令旁路
 */
export type MentionGateResult = {
    effectiveWasMentioned: boolean;
    shouldSkip: boolean;
};
export type MentionGateWithBypassResult = MentionGateResult & {
    shouldBypassMention: boolean;
};
export type GroupMessageGateAction = 
/** @了其他人但未 @bot，丢弃并记录历史 */
"drop_other_mention"
/** 未授权控制命令，静默拦截 */
 | "block_unauthorized_command"
/** 非 @bot 消息，记录历史后跳过 AI */
 | "skip_no_mention"
/** 正常放行，交给 AI */
 | "pass";
export type GroupMessageGateResult = {
    action: GroupMessageGateAction;
    /** 仅 action=pass|skip_no_mention 时有值 */
    effectiveWasMentioned: boolean;
    shouldBypassMention: boolean;
};
export type GroupMessageGateParams = {
    ignoreOtherMentions: boolean;
    hasAnyMention: boolean;
    wasMentioned: boolean;
    implicitMention: boolean;
    allowTextCommands: boolean;
    isControlCommand: boolean;
    commandAuthorized: boolean;
    requireMention: boolean;
    canDetectMention: boolean;
};
/**
 * 群消息统一门控，按优先级串行判定：
 *
 *   1. ignoreOtherMentions — @了其他人但未 @bot → drop_other_mention
 *   2. shouldBlock         — 未授权控制命令      → block_unauthorized_command
 *   3. mentionGating       — 未满足 @bot 条件    → skip_no_mention
 *   4. 通过所有检查                              → pass
 */
export declare function resolveGroupMessageGate(params: GroupMessageGateParams): GroupMessageGateResult;
