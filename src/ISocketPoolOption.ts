export default interface ISocketPoolOption {
    host: string;
    port: number;
    // 最多维持连接数
    maxActive?: number;
    // 最多保留空闲连接数
    maxIdle?: number;
    // pool中没有资源返回时，最大等待时间(毫秒)
    maxWait?: number;
};
