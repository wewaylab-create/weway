/**
 * QQ Bot 文本解析工具函数
 */
import type { RefAttachmentSummary } from "../ref-index-store.js";
/**
 * 解析 QQ 表情标签，将 <faceType=1,faceId="13",ext="base64..."> 格式
 * 替换为 【表情: 中文名】 格式
 * ext 字段为 Base64 编码的 JSON，格式如 {"text":"呲牙"}
 */
export declare function parseFaceTags(text: string): string;
/**
 * 过滤内部标记（如 [[reply_to: xxx]]）
 * 这些标记可能被 AI 错误地学习并输出，需要在发送前移除
 */
export declare function filterInternalMarkers(text: string): string;
/** 从 ext 和 msg_elements 中解析引用索引，仅 MSG_TYPE_QUOTE 时取 msg_elements */
export declare function parseRefIndices(ext?: string[], messageType?: number, msgElements?: Array<{
    msg_idx?: string;
}>): {
    refMsgIdx?: string;
    msgIdx?: string;
};
/**
 * 从附件列表中构建附件摘要（用于引用索引缓存）
 */
export declare function buildAttachmentSummaries(attachments?: Array<{
    content_type: string;
    url: string;
    filename?: string;
    voice_wav_url?: string;
}>, localPaths?: Array<string | null>): RefAttachmentSummary[] | undefined;
