import ISocketPoolOption from "./ISocketPoolOption";
import WrappedSocket from "./WrappedSocket";
import schedule from "node-schedule";

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
    }

    private createResources(count: number = 1) {
        const {
            maxActive,
            maxIdleTime,
            host,
            port,
            resourceRequestList
        } = this;
        const currentCount = this.getResourceCount();
        if (count + currentCount > maxActive) {
            count = Math.max(maxActive - currentCount, 0);
        }
        for (let i = 0; i < count; i++) {
            const client = new WrappedSocket(host, port, maxIdleTime);
            client.on("connect", () => {
                console.log(
                    "Socket server connectted, remote address is: %s %s",
                    host,
                    port
                );
                this.resources.push(client);
            });
            client.on("timeout", () => {
                client.toggleIdle(true);
                if (resourceRequestList.length > 0) {
                    const req = resourceRequestList.shift() as ResourceRequest;
                    req.resolve(client);
                }
            });
            client.on("close", () => {
                console.log("Socket server closed");
            });
            client.on("error", err => {
                console.error("Socket error:", err);
                this.removeResource(client.getId());
            });
        }
    }

    private removeResource(id: Symbol) {
        const { resources } = this;
        const newResources = resources.filter(res => res.getId() !== id);
        this.resources = newResources;
    }

    public getResource(): Promise<WrappedSocket> {
        const resourceCount = this.getResourceCount();
        const { resources, maxWait } = this;
        return new Promise((resolve, reject) => {
            if (resourceCount > 0) {
                for (let i = 0; i < resourceCount; i++) {
                    let res = resources[i];
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
            const { resources } = this;
            this.resources = resources.filter(
                item => item.getId() !== res.getId()
            );
        }
    }
}
