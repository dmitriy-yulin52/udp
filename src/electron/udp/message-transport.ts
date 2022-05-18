import { Message } from './oldmessages';
import {MessageSocket} from './udp-socket';

export interface MessageTransport {
    messageSocket: MessageSocket;
    ip: string;

    onMessageReceived(callback: (msg: Message) => void): void;

    send(msg: Message): void;
}

class EventSource<E> {
    listeners: Array<(event: E) => void> = [];

    public addListener(listener: (event: E) => void) {
        this.listeners.push(listener);
    }

    public removeListener(listener: (event: E) => void) {
        const index = this.listeners.indexOf(listener);
        if (index != -1) this.listeners.splice(index, 1);
    }

    public fire(event: E) {
        this.listeners.forEach((listener) => listener(event));
    }
}

export class MutableMessageTransport implements MessageTransport {
    private eventSource: EventSource<Message> = new EventSource<Message>();

    constructor(public readonly messageSocket: MessageSocket, public ip: string) {
        // messageSocket.onReceive((msg, addr) => {
        //     if (addr == ip) {
        //         this.eventSource.fire(msg)
        //     }
        // })
    }

    onMessageReceived(callback: (msg: Message) => void): void {
        this.eventSource.addListener(callback);
    }

    public onMessage(msg: Message) {
        // console.log('RECEIVE', msg);
        this.eventSource.fire(msg);
    }

    send(msg: Message): void {
        // console.log('SEND', msg);
        this.messageSocket.send(msg, this.ip);
    }
}

export type MessageClass<R extends Message> = {new (...args: any[]): R};
