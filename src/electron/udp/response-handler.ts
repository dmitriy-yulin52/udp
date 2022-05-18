import { Action } from 'redux';
import {MessageClass, MessageTransport} from './message-transport';
import { FileClose, FileCloseResponse, FileContent, FileError, FileErrorToString, FileMode, FileOpen, FileOpenResponse, FileRead, FileWrite, FileWriteResponse, Message } from './oldmessages';



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




const maxFileChunkSize = 100

export function transform_in8array(data: Uint8Array, chunk_size: number): Uint8Array[] {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < Math.ceil(data.length / chunk_size); i++) {
        parts.push(data.slice(i * chunk_size, (i + 1) * chunk_size));
    }
    return parts;
}

export class SmartFileTransferManager {
    private content: Uint8Array = new Uint8Array();
    private handle: number | null = null;
    private totalLength = 0;
    private resolve?: (data: Uint8Array) => void;
    private reject?: (error: Error) => void;

    constructor(
        readonly responseHandler: ResponseHandler,
        readonly messageTransport: MessageTransport,
        readonly dispatch: (action: Action) => Action
    ) {
        this.messageTransport.onMessageReceived(this.onMessage);
    }

    public async writeFile(fileName: string, data: Uint8Array): Promise<void> {
        const openResponse = await this.responseHandler.sendWithResponse(
            new FileOpen(fileName, FileMode.CreateAlways | FileMode.Write),
            FileOpenResponse
        );

        console.log('openResponse-writeFile- !Before!');
        if (openResponse.errorCode !== FileError.OK) {
            const error = FileErrorToString(openResponse.errorCode);
            throw Error(error);
        }
        console.log('openResponse-writeFile- !After!');

        const parts = transform_in8array(data, maxFileChunkSize);

        try {
            if (parts.length > 0) {
                for (const msg of parts.slice(0, parts.length - 1)) {
                    const index = parts.slice(0, parts.length - 1).indexOf(msg);
                    await this.responseHandler.sendWithResponse(
                        new FileWrite(
                            openResponse.handle,
                            index * maxFileChunkSize,
                            msg
                        ),
                        FileWriteResponse
                    );
                }

                console.log('writeResponse-writeFile- !Before!');
                const writeResponse = await this.responseHandler.sendWithResponse(
                    new FileWrite(
                        openResponse.handle,
                        (parts.length - 1) * maxFileChunkSize,
                        parts[parts.length - 1]
                    ),
                    FileWriteResponse
                );
                console.log('writeResponsewriteFile- !After!');
                if (writeResponse.errorCode !== FileError.OK) {
                    const error = FileErrorToString(openResponse.errorCode);
                    throw Error(error);
                }
            }
        } finally {
            console.log('closeResponse-writeFile- !Before!');
            const closeResponse = await this.responseHandler.sendWithResponse(
                new FileClose(openResponse.handle),
                FileCloseResponse
            );
            console.log('closeResponse-writeFile- !After!');

            if (closeResponse.errorCode !== FileError.OK) {
                const error = FileErrorToString(openResponse.errorCode);
                // eslint-disable-next-line no-unsafe-finally
                throw Error(error);
            }
        }
    }

    public async readFile(filename: string): Promise<Uint8Array> {
        if (this.resolve) {
            throw Error('FIXME: readFile is not reentrant yet');
        }

        const openResponse = await this.responseHandler.sendWithResponse(
            new FileOpen(filename, FileMode.Read),
            FileOpenResponse
        );

        if (openResponse.errorCode !== FileError.OK) {
            const error = FileErrorToString(openResponse.errorCode);
            throw Error(error);
        }

        this.handle = openResponse.handle;
        this.totalLength = openResponse.fileSize;
        this.content = new Uint8Array();

        const promise = new Promise<Uint8Array>((resolve, reject) => {
            this.resolve = resolve as (data: Uint8Array) => void;
            this.reject = reject;
        });

        this.messageTransport.send(
            new FileRead(openResponse.handle, 0, openResponse.fileSize)
        );

        return await promise;
    }

    private async close() {
        if (!this.handle || !this.resolve) return;

        await this.responseHandler.sendWithResponse(
            new FileClose(this.handle),
            FileCloseResponse
        );

        const resolve = this.resolve;
        const content = this.content;

        this.handle = null;
        this.resolve = this.reject = undefined;
        this.content = new Uint8Array();

        resolve(content);
    }

    private onMessage = (msg: Message) => {
        if (this.handle != null && msg instanceof FileContent) {
            if (msg.position == this.content.length && msg.data.length != 0) {
                this.content = new Uint8Array([...this.content, ...msg.data]);

                if (this.content.length == this.totalLength) {
                    this.close().then();
                }
            }
        }
    };
}



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



