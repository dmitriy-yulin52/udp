import {createSocket, RemoteInfo, Socket} from 'dgram';
import { Message } from './oldmessages';
// import {configDictFromText} from '../Z3KConfigParser/parser/config-convertor/fromText/configFromText';
// import {parseState} from '../Z3KConfigParser/parser/state/parseState';

export type DoubleSocketType = {
    getSocket: MessageSocket | null;
    sendSocket: MessageSocket | null;
};

export class DoubleSocket implements DoubleSocketType {
    getSocket: MessageSocket | null = null;
    sendSocket: MessageSocket | null = null;
    listenerSocket: UDPSocket;
    sendlerSocket: UDPSocket;

    constructor() {
        this.listenerSocket = new UDPSocket(49080);
        this.sendlerSocket = new UDPSocket(49079, 49080);
    }

    async init(): Promise<void> {
        await Promise.all([this.listenerSocket.up(), this.sendlerSocket.up()]);
        this.getSocket = new MessageSocket(this.listenerSocket);
        this.sendSocket = new MessageSocket(this.sendlerSocket);
    }
}

export class UDPSocket {
    readonly socket: Socket;

    constructor(
        readonly listenerSocketPort: number,
        readonly SenderSocketPort?: number
    ) {
        this.socket = createSocket('udp4');
    }

    async up(): Promise<void> {
        this.socket.on('listening', () => {
            const address = this.socket.address();
        });

        this.socket.on('error', (err) => {
            console.warn('ErrorSocket' + err);
            this.socket.close();
        });

        await new Promise<void>((resolve, reject) => {
            this.socket.bind(this.listenerSocketPort, resolve);
        });
    }

    send(bytes: Uint8Array, addr?: string): void {
        this.socket.setBroadcast(!addr);
        this.socket.send(
            bytes,
            this.SenderSocketPort ? this.SenderSocketPort : this.listenerSocketPort,
            addr ? addr : '255.255.255.255'
        );
    }

    onReceive(callback: (bytes: ArrayBuffer, addr: string) => void): void {
        this.socket.on('message', (buffer: ArrayBuffer, rinfo: RemoteInfo) => {
            callback(buffer, rinfo.address);
        });
    }
}

function toHexString(byteArray: Uint8Array): string {
    let s = '';
    byteArray.forEach(function (byte) {
        s += ' ' + ('0' + (byte & 0xff).toString(16)).slice(-2);
    });
    return s;
}

export class MessageSocket {

    constructor(readonly udpSocket: UDPSocket) {}

    public send(msg: Message, addr?: string): void {
        this.udpSocket.send(msg.toBinary(), addr);
    }

    public onReceive(callback: (message: Message, addr: string) => void): void {
        this.udpSocket.onReceive((bytes, addr) => {
            const uint8: Uint8Array = new Uint8Array(bytes);
            // console.log('>>', toHexString(uint8));
            const message: Message = Message.fromBinary(uint8);
            callback(message, addr);
        });
    }
}
