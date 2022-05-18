
import {MessageClass, MessageTransport} from './message-transport';
import { Message } from './oldmessages';



declare type SafeDictionary<T, K extends string | number = string> = {
    [key in K]?: T;
  };

type RequestCollector = SafeDictionary<
    {
        expires: number;
        resolve: (response: Message) => void;
        reject: (error: Error) => void;
        expectedResponseType: MessageClass<Message>;
    },
    number
>;


export class ResponseHandler {
    requests: RequestCollector = {};
    minAddress = 10;
    maxAddress = 250;
    nextAddress: number = this.minAddress;

    constructor(readonly messageTransport: MessageTransport) {
        this.messageTransport.onMessageReceived(this.onMessage);
        setInterval(this.onTimer, 10e3);
    }

    public setNextAddr<R extends Message>(msg: R): void {
        if (Object.keys(this.requests).length >= this.maxAddress - this.minAddress) {
            throw new Error('No available response addresses');
        }

        while (this.requests[this.nextAddress] != null) {
            this.nextAddress++;
            if (this.nextAddress >= this.maxAddress) this.nextAddress = this.minAddress;
        }

        msg.setSRC(this.nextAddress);
        this.nextAddress++;
        if (this.nextAddress >= this.maxAddress) this.nextAddress = this.minAddress;
    }

    public send(msg: Message) {
        this.messageTransport.send(msg);
    }

    public sendWithResponse<R extends Message>(
        msg: Message,
        expectedResponseType: MessageClass<R>,
        timeout = 60e3
    ): Promise<R> {
        this.setNextAddr(msg);
        this.send(msg);
        return new Promise((resolve, reject) => {
            this.requests[msg.src] = {
                expires: Date.now() + timeout,
                resolve: resolve as (response: Message) => void,
                reject: reject,
                expectedResponseType,
            };
        });
    }

    private onMessage = (msg: Message) => {
        const request = this.requests[msg.dst];
        if (request) {
            if (msg instanceof request.expectedResponseType) {
                delete this.requests[msg.dst];
                request.resolve(msg);
            }
        }
    };

    public onTimer = () => {
        const now = Date.now();

        const arr:[string, any][] = Object.entries(this.requests)
        
        for (const [addr, pending] of arr) {
            if (!pending) continue;
            if (pending.expires < now) {
                delete this.requests[+addr];
                pending.reject(new Error('timeout'));
            }
        }
    };
}



