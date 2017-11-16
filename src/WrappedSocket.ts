import * as net from "net";

export default class WrappedSocket extends net.Socket {
    private resourceId: Symbol;

    private idle: boolean = true;

    public constructor(host: string, port: number, idleTimeout: number) {
        super();
        this.setTimeout(idleTimeout);
        this.connect(port, host);
        this.resourceId = Symbol();

        // events
    }

    public getId() {
        return this.resourceId;
    }

    public isIdle() {
        return this.idle;
    }

    public toggleIdle(idle: boolean) {
        this.idle = idle;
    }

    // return socket connection to pool instead of close directly
    public release() {
        //TODO
    }
}
