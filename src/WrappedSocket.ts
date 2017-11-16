import * as net from "net";

export default class WrappedSocket extends net.Socket {
    private resourceId: Symbol;

    private idle: boolean = true;

    private releaseCb: (client: WrappedSocket) => void;

    public constructor(
        host: string,
        port: number,
        idleTimeout: number,
        release: (client: WrappedSocket) => void
    ) {
        super();
        this.setTimeout(idleTimeout);
        this.connect(port, host);
        this.resourceId = Symbol();

        this.releaseCb = release;
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
        this.releaseCb(this);
    }
}
