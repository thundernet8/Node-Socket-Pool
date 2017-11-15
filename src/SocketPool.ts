import ISocketPoolOption from "./ISocketPoolOption";
import WrappedSocket from "./WrappedSocket";

export default class SocketPool {
    public constructor(options: ISocketPoolOption) {
        //
    }

    public getResource(): WrappedSocket {
        // TODO
        return null as any;
    }

    public returnResource() {
        // TODO
    }

    public returnBrokonResource() {
        // TODO
    }
}
