import ISocketPoolOption from "./ISocketPoolOption";
import WrappedSocket from "./WrappedSocket";
import { TimeLogger } from "./Utils";
import * as schedule from "node-schedule";

class ResourceRequest {
    private expired: boolean = false;
    private resolved: boolean = false;
    private cb: (err: Error | null, resource?: WrappedSocket) => void;

    public constructor(
        timeout: number,
        cb: (err: Error | null, resource?: WrappedSocket) => void
    ) {
        this.cb = cb;
        const startTime = new Date(Date.now() + timeout);
        const endTime = new Date(startTime.getTime() + 1000);
        schedule.scheduleJob(
            { start: startTime, end: endTime, rule: "*/1 * * * *" },
            () => {
                this.expired = true;
                if (!this.resolved) {
                    TimeLogger(
                        "Acquire socket connection failed as waiting for more than %s milliseconds",
                        timeout
                    );
                    this.cb(new Error("Request socket connection failed"));
                }
            }
        );
    }

    public isExpired() {
        return this.expired;
    }

    public resolve(resource: WrappedSocket) {
        this.resolved = true;
        resource.toggleIdle(false);
        this.cb(null, resource);
    }
}

export default class SocketPool {
    private resources: WrappedSocket[] = [];

    private resourceRequestList: ResourceRequest[] = [];

    private maxActive: number;
    private maxIdle: number;
    private maxIdleTime: number;
    private maxWait: number;
    private host: string;
    private port: number;

    public constructor(options: ISocketPoolOption) {
        const {
            host,
            port,
            maxActive,
            maxIdle,
            maxIdleTime,
            maxWait
        } = options;
        this.host = host;
        this.port = port;
        this.maxIdle = maxIdle || 5;
        this.maxIdleTime = maxIdleTime || 5 * 60000; // 最长5min空闲连接
        this.maxActive = Math.max(maxActive || 10, this.maxIdle);
        this.maxWait = maxWait || 3000;

        this.createResources(maxIdle);
    }

    private createResources(count: number = 1) {
        const { maxActive, maxIdleTime, host, port } = this;
        const currentCount = this.getResourceCount();
        if (count + currentCount > maxActive) {
            count = Math.max(maxActive - currentCount, 0);
        }
        for (let i = 0; i < count; i++) {
            TimeLogger("Creating socket connection");
            const client = new WrappedSocket(
                host,
                port,
                maxIdleTime,
                this.returnResource
            );
            this.resources.push(client);
            client.on("connect", () => {
                TimeLogger(
                    "Socket server connectted, remote address is: %s:%s",
                    host,
                    port
                );
                this.notifyResourceAvailable(client);
            });
            client.on("timeout", () => {
                TimeLogger(
                    "Socket connection resource return back to idle pool as no data sending for a time up to timeout"
                );
                this.notifyResourceAvailable(client);
            });
            client.on("close", () => {
                TimeLogger("Socket server closed");
            });
            client.on("error", err => {
                TimeLogger("Socket error:", err);
                this.removeResource(client.getId());
            });
        }
    }

    private removeResource(id: Symbol) {
        const { resources } = this;
        const newResources = resources.filter(res => res.getId() !== id);
        this.resources = newResources;
    }

    private notifyResourceAvailable(res: WrappedSocket) {
        const { resourceRequestList, resources, maxIdle } = this;
        res.toggleIdle(true);
        if (resourceRequestList.length > 0) {
            const req = resourceRequestList.shift() as ResourceRequest;
            req.resolve(res);
        } else {
            // 如果超过最大闲置数量，释放
            if (resources.length > maxIdle) {
                TimeLogger("Close redundant connection resource");
                this.removeResource(res.getId());
                res.destroy();
            }
        }
    }

    public getResource(): Promise<WrappedSocket> {
        const { resources, maxWait } = this;
        const idleResources = resources.filter(
            res => res.isIdle() && !res.destroyed && !res.connecting
        );
        return new Promise((resolve, reject) => {
            if (idleResources.length > 0) {
                for (let i = 0; i < idleResources.length; i++) {
                    let res = idleResources[i];
                    if (res.isIdle()) {
                        res.toggleIdle(false);
                        return resolve(res);
                    }
                }
            } else {
                if (resources.length < this.maxActive) {
                    this.createResources();
                }
                this.resourceRequestList.push(
                    new ResourceRequest(
                        maxWait,
                        (err, resource: WrappedSocket) => {
                            if (err || !resource) {
                                return reject(err);
                            } else {
                                return resolve(resource);
                            }
                        }
                    )
                );
            }
        });
    }

    public getResourceCount(): number {
        const { resources } = this;
        const validResources = resources.filter(res => !res.destroyed);
        this.resources = validResources;
        return validResources.length;
    }

    public returnResource(res: WrappedSocket) {
        if (!res.destroyed) {
            res.toggleIdle(true);
        } else {
            this.removeResource(res.getId());
        }
    }
}
