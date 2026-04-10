export interface RequestContext {
    /** 投递目标地址，如 qqbot:c2c:xxx 或 qqbot:group:xxx */
    target: string;
    /** 当前请求的 QQBot 账户 ID（多账户场景） */
    accountId?: string;
}
/**
 * 在请求级作用域中执行回调。
 * 作用域内所有同步/异步代码都能通过 getRequestContext() 获取上下文。
 */
export declare function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T;
/**
 * 获取当前请求的上下文，不存在时返回 undefined。
 */
export declare function getRequestContext(): RequestContext | undefined;
/**
 * 获取当前请求的投递目标地址。
 * 便捷方法，等价于 getRequestContext()?.target。
 */
export declare function getRequestTarget(): string | undefined;
/**
 * 获取当前请求的账户 ID。
 * 便捷方法，等价于 getRequestContext()?.accountId。
 */
export declare function getRequestAccountId(): string | undefined;
