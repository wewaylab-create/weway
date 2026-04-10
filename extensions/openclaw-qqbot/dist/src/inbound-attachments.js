/**
 * 入站附件处理模块
 *
 * 负责下载、转换、转录用户发送的附件（图片/语音/文件），
 * 并归类为统一的 ProcessedAttachments 结构供 gateway 消费。
 */
import { downloadFile } from "./image-server.js";
import { convertSilkToWav, isVoiceAttachment, formatDuration } from "./utils/audio-convert.js";
import { transcribeAudio, resolveSTTConfig } from "./stt.js";
import { getQQBotMediaDir } from "./utils/platform.js";
// ============ 空结果常量 ============
const EMPTY_RESULT = {
    attachmentInfo: "",
    imageUrls: [],
    imageMediaTypes: [],
    voiceAttachmentPaths: [],
    voiceAttachmentUrls: [],
    voiceAsrReferTexts: [],
    voiceTranscripts: [],
    voiceTranscriptSources: [],
    attachmentLocalPaths: [],
};
// ============ 主函数 ============
/**
 * 处理入站消息的附件列表。
 *
 * 三阶段流水线：
 * 1. 并行下载所有附件到本地
 * 2. 并行处理语音转换 + STT 转录
 * 3. 按原始顺序归类结果
 */
export async function processAttachments(attachments, ctx) {
    if (!attachments?.length)
        return EMPTY_RESULT;
    const { appId, peerId, cfg, log } = ctx;
    const subPaths = ["downloads", appId, ...(peerId ? [peerId] : [])];
    const downloadDir = getQQBotMediaDir(...subPaths);
    const prefix = `[qqbot:${appId}]`;
    // 结果收集
    const imageUrls = [];
    const imageMediaTypes = [];
    const voiceAttachmentPaths = [];
    const voiceAttachmentUrls = [];
    const voiceAsrReferTexts = [];
    const voiceTranscripts = [];
    const voiceTranscriptSources = [];
    const attachmentLocalPaths = [];
    const otherAttachments = [];
    // 入站附件下载：限制 2 分钟，不限大小
    const INBOUND_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000; // 2 分钟
    // Phase 1: 并行下载所有附件
    const downloadTasks = attachments.map(async (att) => {
        const attUrl = att.url?.startsWith("//") ? `https:${att.url}` : att.url;
        const isVoice = isVoiceAttachment(att);
        const wavUrl = isVoice && att.voice_wav_url
            ? (att.voice_wav_url.startsWith("//") ? `https:${att.voice_wav_url}` : att.voice_wav_url)
            : "";
        let localPath = null;
        let audioPath = null;
        let dlError;
        if (isVoice && wavUrl) {
            const wavResult = await downloadFile(wavUrl, undefined, { destDir: downloadDir, timeoutMs: INBOUND_DOWNLOAD_TIMEOUT_MS });
            if (wavResult.filePath) {
                localPath = wavResult.filePath;
                audioPath = wavResult.filePath;
                log?.info(`${prefix} Voice attachment: ${att.filename}, downloaded WAV directly (skip SILK→WAV)`);
            }
            else {
                log?.error(`${prefix} Failed to download voice_wav_url (${wavResult.error}), falling back to original URL`);
            }
        }
        if (!localPath) {
            const dlResult = await downloadFile(attUrl, att.filename, { destDir: downloadDir, timeoutMs: INBOUND_DOWNLOAD_TIMEOUT_MS });
            localPath = dlResult.filePath;
            dlError = dlResult.error;
        }
        return { att, attUrl, isVoice, localPath, audioPath, dlError };
    });
    const downloadResults = await Promise.all(downloadTasks);
    // Phase 2: 并行处理语音转换 + 转录（非语音附件同步归类）
    const processTasks = downloadResults.map(async ({ att, attUrl, isVoice, localPath, audioPath, dlError }) => {
        const asrReferText = typeof att.asr_refer_text === "string" ? att.asr_refer_text.trim() : "";
        const wavUrl = isVoice && att.voice_wav_url
            ? (att.voice_wav_url.startsWith("//") ? `https:${att.voice_wav_url}` : att.voice_wav_url)
            : "";
        const voiceSourceUrl = wavUrl || attUrl;
        const meta = {
            voiceUrl: isVoice && voiceSourceUrl ? voiceSourceUrl : undefined,
            asrReferText: isVoice && asrReferText ? asrReferText : undefined,
        };
        if (localPath) {
            if (att.content_type?.startsWith("image/")) {
                log?.info(`${prefix} Downloaded attachment to: ${localPath}`);
                return { localPath, type: "image", contentType: att.content_type, meta };
            }
            else if (isVoice) {
                log?.info(`${prefix} Downloaded attachment to: ${localPath}`);
                return processVoiceAttachment(localPath, audioPath, att, asrReferText, cfg, downloadDir, log, prefix);
            }
            else {
                log?.info(`${prefix} Downloaded attachment to: ${localPath}`);
                return { localPath, type: "other", filename: att.filename, meta };
            }
        }
        else {
            log?.error(`${prefix} Failed to download: ${attUrl}`);
            if (att.content_type?.startsWith("image/")) {
                return { localPath: null, type: "image-fallback", attUrl, contentType: att.content_type, dlError, meta };
            }
            else if (isVoice && asrReferText) {
                log?.info(`${prefix} Voice attachment download failed, using asr_refer_text fallback`);
                return { localPath: null, type: "voice-fallback", transcript: asrReferText, meta };
            }
            else {
                return { localPath: null, type: "other-fallback", filename: att.filename ?? att.content_type, dlError, meta };
            }
        }
    });
    const processResults = await Promise.all(processTasks);
    // Phase 3: 按原始顺序归类结果
    for (const result of processResults) {
        if (result.meta.voiceUrl)
            voiceAttachmentUrls.push(result.meta.voiceUrl);
        if (result.meta.asrReferText)
            voiceAsrReferTexts.push(result.meta.asrReferText);
        if (result.type === "image" && result.localPath) {
            imageUrls.push(result.localPath);
            imageMediaTypes.push(result.contentType);
            attachmentLocalPaths.push(result.localPath);
        }
        else if (result.type === "voice" && result.localPath) {
            voiceAttachmentPaths.push(result.localPath);
            voiceTranscripts.push(result.transcript);
            voiceTranscriptSources.push(result.transcriptSource);
            attachmentLocalPaths.push(result.localPath);
        }
        else if (result.type === "other" && result.localPath) {
            otherAttachments.push(`[附件: ${result.localPath}]`);
            attachmentLocalPaths.push(result.localPath);
        }
        else if (result.type === "image-fallback") {
            imageUrls.push(result.attUrl);
            imageMediaTypes.push(result.contentType);
            attachmentLocalPaths.push(null);
            // 给模型一个明确的失败提示（和 other-fallback 对齐）
            const hint = result.dlError?.includes("超时")
                ? "(图片下载超时)"
                : "(图片下载失败)";
            otherAttachments.push(`[图片] ${hint}`);
        }
        else if (result.type === "voice-fallback") {
            voiceTranscripts.push(result.transcript);
            voiceTranscriptSources.push("asr");
            attachmentLocalPaths.push(null);
        }
        else if (result.type === "other-fallback") {
            const hint = result.dlError?.includes("超时")
                ? "(下载超时)"
                : "(下载失败)";
            otherAttachments.push(`[附件: ${result.filename}] ${hint}`);
            attachmentLocalPaths.push(null);
        }
    }
    const attachmentInfo = otherAttachments.length > 0 ? "\n" + otherAttachments.join("\n") : "";
    return {
        attachmentInfo,
        imageUrls,
        imageMediaTypes,
        voiceAttachmentPaths,
        voiceAttachmentUrls,
        voiceAsrReferTexts,
        voiceTranscripts,
        voiceTranscriptSources,
        attachmentLocalPaths,
    };
}
/**
 * 将语音转录结果组装为用户消息中的文本片段。
 */
export function formatVoiceText(transcripts) {
    if (transcripts.length === 0)
        return "";
    return transcripts.length === 1
        ? `[语音消息] ${transcripts[0]}`
        : transcripts.map((t, i) => `[语音${i + 1}] ${t}`).join("\n");
}
async function processVoiceAttachment(localPath, audioPath, att, asrReferText, cfg, downloadDir, log, prefix) {
    const wavUrl = att.voice_wav_url
        ? (att.voice_wav_url.startsWith("//") ? `https:${att.voice_wav_url}` : att.voice_wav_url)
        : "";
    const attUrl = att.url?.startsWith("//") ? `https:${att.url}` : att.url;
    const voiceSourceUrl = wavUrl || attUrl;
    const meta = {
        voiceUrl: voiceSourceUrl || undefined,
        asrReferText: asrReferText || undefined,
    };
    const sttCfg = resolveSTTConfig(cfg);
    if (!sttCfg) {
        if (asrReferText) {
            log?.info(`${prefix} Voice attachment: ${att.filename} (STT not configured, using asr_refer_text fallback)`);
            return { localPath, type: "voice", transcript: asrReferText, transcriptSource: "asr", meta };
        }
        log?.info(`${prefix} Voice attachment: ${att.filename} (STT not configured, skipping transcription)`);
        return { localPath, type: "voice", transcript: "[语音消息 - 语音识别未配置，无法转录]", transcriptSource: "fallback", meta };
    }
    // SILK→WAV 转换
    if (!audioPath) {
        log?.info(`${prefix} Voice attachment: ${att.filename}, converting SILK→WAV...`);
        try {
            const wavResult = await convertSilkToWav(localPath, downloadDir);
            if (wavResult) {
                audioPath = wavResult.wavPath;
                log?.info(`${prefix} Voice converted: ${wavResult.wavPath} (${formatDuration(wavResult.duration)})`);
            }
            else {
                audioPath = localPath;
            }
        }
        catch (convertErr) {
            log?.error(`${prefix} Voice conversion failed: ${convertErr}`);
            if (asrReferText) {
                return { localPath, type: "voice", transcript: asrReferText, transcriptSource: "asr", meta };
            }
            return { localPath, type: "voice", transcript: "[语音消息 - 格式转换失败]", transcriptSource: "fallback", meta };
        }
    }
    // STT 转录
    try {
        const transcript = await transcribeAudio(audioPath, cfg);
        if (transcript) {
            log?.info(`${prefix} STT transcript: ${transcript.slice(0, 100)}...`);
            return { localPath, type: "voice", transcript, transcriptSource: "stt", meta };
        }
        if (asrReferText) {
            log?.info(`${prefix} STT returned empty result, using asr_refer_text fallback`);
            return { localPath, type: "voice", transcript: asrReferText, transcriptSource: "asr", meta };
        }
        log?.info(`${prefix} STT returned empty result`);
        return { localPath, type: "voice", transcript: "[语音消息 - 转录结果为空]", transcriptSource: "fallback", meta };
    }
    catch (sttErr) {
        log?.error(`${prefix} STT failed: ${sttErr}`);
        if (asrReferText) {
            return { localPath, type: "voice", transcript: asrReferText, transcriptSource: "asr", meta };
        }
        return { localPath, type: "voice", transcript: "[语音消息 - 转录失败]", transcriptSource: "fallback", meta };
    }
}
