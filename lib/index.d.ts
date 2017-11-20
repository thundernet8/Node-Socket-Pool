import * as net from "net";

declare class SocketPool {
    constructor(options: SocketPool.ISocketPoolOption);

    getResource(): Promise<SocketPool.WrappedSocket>;

    getResourceCount(): number;

    returnResource(client: SocketPool.WrappedSocket): void;
}

declare namespace SocketPool {
    export interface ISocketPoolOption {
        host: string;
        port: number;
        // 最多维持连接数
        maxActive?: number;
        // 最多保留空闲连接数
        maxIdle?: number;
        // Socket连接最长空闲时间(毫秒)(超过时间后将返回资源池)
        maxIdleTime?: number;
        // pool中没有资源返回时，最大等待时间(毫秒)
        maxWait?: number;
    }

    export class WrappedSocket extends net.Socket {
        release: void;
    }
}
