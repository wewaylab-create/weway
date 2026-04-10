/**
 * 从 import.meta.url 向上遍历目录树查找 package.json 并读取 version。
 * 不依赖硬编码的 "../" 层级，无论编译输出结构如何变化都能可靠找到。
 */
export declare function getPackageVersion(metaUrl?: string): string;
