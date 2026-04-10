import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
/**
 * 注册 QQ 频道 API 代理工具。
 *
 * 该工具作为 QQ 开放平台频道 API 的 HTTP 代理，自动处理 Token 鉴权。
 * AI 通过 skill 文档了解各接口的路径、方法和参数，构造请求后由此工具代理发送。
 *
 * 支持的能力：
 * - 频道管理（Guild）
 * - 子频道管理（Channel）
 * - 成员管理（Member）
 * - 公告管理（Announces）
 * - 论坛管理（Forum Thread）
 * - 日程管理（Schedule）
 */
export declare function registerChannelTool(api: OpenClawPluginApi): void;
