/**
 * 大文件分片上传模块
 *
 * 流程（对照序列图）：
 * 1. 申请上传 (upload_prepare) → 获取 upload_id + block_size + 分片预签名链接
 * 2. 并行上传所有分片：
 *    对于每个分片 i（并行执行，但分片内部串行）：
 *      a. 读取文件的第 i 块数据
 *      b. PUT 到预签名 URL (COS)
 *      c. 调用 upload_part_finish 通知开放平台分片 i 已完成
 * 3. 所有分片完成后，调用完成文件上传接口 → 获取 file_info
 *
 * 注意：N 个分片之间是并行的，但每个分片的"上传 + 完成"是串行的。
 */
import { type MediaFileType, type MediaUploadResponse } from "../api.js";
/**
 * upload_prepare 返回特定错误码（40093002）时抛出：文件超过每日累积上传限制
 * 调用方根据携带的文件信息构造兜底文案发送给用户
 */
export declare class UploadDailyLimitExceededError extends Error {
    /** 触发错误的本地文件路径 */
    readonly filePath: string;
    /** 文件大小（字节） */
    readonly fileSize: number;
    constructor(filePath: string, fileSize: number, originalMessage: string);
}
/** 分片上传进度回调 */
export interface ChunkedUploadProgress {
    /** 当前已完成分片数 */
    completedParts: number;
    /** 总分片数 */
    totalParts: number;
    /** 已上传字节数 */
    uploadedBytes: number;
    /** 总字节数 */
    totalBytes: number;
}
/** 分片上传选项 */
export interface ChunkedUploadOptions {
    /** 进度回调 */
    onProgress?: (progress: ChunkedUploadProgress) => void;
    /** 日志前缀 */
    logPrefix?: string;
}
/**
 * C2C 大文件分片上传
 *
 * @param appId - 应用 ID
 * @param clientSecret - 应用密钥
 * @param userId - 用户 openid
 * @param filePath - 本地文件路径
 * @param fileType - 文件类型（1=图片, 2=视频, 3=语音, 4=文件）
 * @param options - 上传选项
 * @returns 上传结果（包含 file_info 可直接用于发送消息）
 */
export declare function chunkedUploadC2C(appId: string, clientSecret: string, userId: string, filePath: string, fileType: MediaFileType, options?: ChunkedUploadOptions): Promise<MediaUploadResponse>;
/**
 * Group 大文件分片上传
 *
 * @param appId - 应用 ID
 * @param clientSecret - 应用密钥
 * @param groupId - 群 openid
 * @param filePath - 本地文件路径
 * @param fileType - 文件类型（1=图片, 2=视频, 3=语音, 4=文件）
 * @param options - 上传选项
 * @returns 上传结果（包含 file_info 可直接用于发送消息）
 */
export declare function chunkedUploadGroup(appId: string, clientSecret: string, groupId: string, filePath: string, fileType: MediaFileType, options?: ChunkedUploadOptions): Promise<MediaUploadResponse>;
