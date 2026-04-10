import type { ResolvedQQBotAccount, ToolPolicy, GroupConfig } from "./types.js";
import type { OpenClawConfig, GroupPolicy } from "openclaw/plugin-sdk";
/**
 * 解析 mentionPatterns（agent → global → 空数组）
 *
 * 优先级：
 *   1. agents.list[agentId].groupChat.mentionPatterns
 *   2. messages.groupChat.mentionPatterns
 *   3. []
 */
export declare function resolveMentionPatterns(cfg: OpenClawConfig, agentId?: string): string[];
export declare const DEFAULT_ACCOUNT_ID = "default";
/** 解析群消息策略 */
export declare function resolveGroupPolicy(cfg: OpenClawConfig, accountId?: string): GroupPolicy;
/** 解析群白名单（统一转大写） */
export declare function resolveGroupAllowFrom(cfg: OpenClawConfig, accountId?: string): string[];
/** 检查指定群是否被允许（使用标准策略引擎） */
export declare function isGroupAllowed(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): boolean;
type ResolvedGroupConfig = Omit<Required<GroupConfig>, "prompt"> & Pick<GroupConfig, "prompt">;
/** 解析指定群配置（具体 groupOpenid > 通配符 "*" > 默认值） */
export declare function resolveGroupConfig(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): ResolvedGroupConfig;
/** 解析群历史消息缓存条数 */
export declare function resolveHistoryLimit(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): number;
/** 解析群行为 PE（具体群 > "*" > 默认值） */
export declare function resolveGroupPrompt(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): string;
/** 解析群是否需要 @机器人才响应 */
export declare function resolveRequireMention(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): boolean;
/** 解析群是否忽略 @了其他人（非 bot）的消息 */
export declare function resolveIgnoreOtherMentions(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): boolean;
/** 解析群工具策略 */
export declare function resolveToolPolicy(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): ToolPolicy;
/** 解析群名称（优先配置，fallback 为 openid 前 8 位） */
export declare function resolveGroupName(cfg: OpenClawConfig, groupOpenid: string, accountId?: string): string;
/**
 * 列出所有 QQBot 账户 ID
 */
export declare function listQQBotAccountIds(cfg: OpenClawConfig): string[];
/**
 * 获取默认账户 ID
 */
export declare function resolveDefaultQQBotAccountId(cfg: OpenClawConfig): string;
/**
 * 解析 QQBot 账户配置
 */
export declare function resolveQQBotAccount(cfg: OpenClawConfig, accountId?: string | null): ResolvedQQBotAccount;
/**
 * 应用账户配置
 */
export declare function applyQQBotAccountConfig(cfg: OpenClawConfig, accountId: string, input: {
    appId?: string;
    clientSecret?: string;
    clientSecretFile?: string;
    name?: string;
    imageServerBaseUrl?: string;
}): OpenClawConfig;
export {};
