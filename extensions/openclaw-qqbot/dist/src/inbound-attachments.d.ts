/**
 * 入站附件处理模块
 *
 * 负责下载、转换、转录用户发送的附件（图片/语音/文件），
 * 并归类为统一的 ProcessedAttachments 结构供 gateway 消费。
 */
export interface RawAttachment {
    content_type: string;
    url: string;
    filename?: string;
    voice_wav_url?: string;
    asr_refer_text?: string;
}
export type TranscriptSource = "stt" | "asr" | "fallback";
/** processAttachments 的返回值 */
export interface ProcessedAttachments {
    /** 附件描述文本（其它类型附件） */
    attachmentInfo: string;
    /** 图片本地路径或远程 URL */
    imageUrls: string[];
    /** 图片 MIME 类型（与 imageUrls 一一对应） */
    imageMediaTypes: string[];
    /** 语音本地路径 */
    voiceAttachmentPaths: string[];
    /** 语音远程 URL */
    voiceAttachmentUrls: string[];
    /** QQ ASR 原始识别文本 */
    voiceAsrReferTexts: string[];
    /** 语音转录文本 */
    voiceTranscripts: string[];
    /** 转录来源 */
    voiceTranscriptSources: TranscriptSource[];
    /** 每个附件的本地路径（与原始 attachments 数组一一对应，未下载的为 null） */
    attachmentLocalPaths: Array<string | null>;
}
interface ProcessContext {
    appId: string;
    /** 对话 ID：群聊传 groupOpenid，私聊传 senderId（用于按群/用户隔离下载目录） */
    peerId?: string;
    cfg: unknown;
    log?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug?: (msg: string) => void;
    };
}
/**
 * 处理入站消息的附件列表。
 *
 * 三阶段流水线：
 * 1. 并行下载所有附件到本地
 * 2. 并行处理语音转换 + STT 转录
 * 3. 按原始顺序归类结果
 */
export declare function processAttachments(attachments: RawAttachment[] | undefined, ctx: ProcessContext): Promise<ProcessedAttachments>;
/**
 * 将语音转录结果组装为用户消息中的文本片段。
 */
export declare function formatVoiceText(transcripts: string[]): string;
export {};
