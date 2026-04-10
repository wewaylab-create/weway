import { type ChannelPlugin } from "openclaw/plugin-sdk/core";
import type { ResolvedQQBotAccount } from "./types.js";
/** QQ Bot 单条消息文本长度上限 */
export declare const TEXT_CHUNK_LIMIT = 5000;
/**
 * Markdown 感知的文本分块函数
 * 委托给 SDK 内置的 channel.text.chunkMarkdownText
 * 支持代码块自动关闭/重开、括号感知等
 */
export declare function chunkText(text: string, limit: number): string[];
export declare const qqbotPlugin: ChannelPlugin<ResolvedQQBotAccount>;
/** 清理 @mention：替换 <@openid> 为 @用户名，去除 @机器人自身 */
export declare function stripMentionText(text: string, mentions?: Array<{
    member_openid?: string;
    id?: string;
    user_openid?: string;
    is_you?: boolean;
    nickname?: string;
    username?: string;
}>): string;
/** 检测消息是否 @了机器人（mentions > eventType > mentionPatterns） */
export declare function detectWasMentioned({ eventType, mentions, content, mentionPatterns }: {
    eventType?: string;
    mentions?: Array<{
        is_you?: boolean;
    }>;
    content?: string;
    mentionPatterns?: string[];
}): boolean;
