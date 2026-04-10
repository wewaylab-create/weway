/**
 * 远程 URL 安全校验
 *
 * 下载外部资源前，确保目标地址不会命中内部网络或云元数据端点，
 * 避免模型输出的恶意链接触达内网服务。
 */
/**
 * 检查给定 IP 是否落在不可路由 / 私有网段内。
 *
 * 覆盖：
 * - IPv4: 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, 0.0.0.0
 * - IPv6: ::1, ::, fe80 (link-local), fc/fd (ULA)
 */
export declare function isReservedAddr(ip: string): boolean;
/**
 * 校验远程 URL 是否可安全请求。
 *
 * 规则：
 * 1. 仅放行 http / https 协议
 * 2. 若 URL 直接携带 IP 则即时判定
 * 3. 若为域名则先做 DNS 解析，逐条检查解析结果
 *
 * @throws {Error} 当 URL 指向受限地址时
 */
export declare function validateRemoteUrl(raw: string): Promise<void>;
