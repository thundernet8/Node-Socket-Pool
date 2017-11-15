import * as net from "net";

export default class WrappedSocket extends net.Socket {
    // return socket connection to pool instead of close directly
    public close() {
        //TODO
    }
}
