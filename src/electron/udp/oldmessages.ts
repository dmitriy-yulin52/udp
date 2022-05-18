// @ts-ignore
import {MessageClass} from './udp-socket';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconv = require('iconv-lite');

export const toHexString = (byteArray: Uint8Array): string => {
    return Array.prototype.map
        .call(byteArray, function (byte: any) {
            return ('0' + (byte & 0xff).toString(16)).slice(-2);
        })
        .join(' ');
};

export abstract class Message {
    readonly signature = [2, 77, 108, 2];
    protected constructor(public dst: number = 0, public src: number = 0) {}

    bin2String(addText: string | null): string {
        if (addText) {
            return `(dst=${this.dst}, src=${this.src}, ${addText})`;
        } else {
            return `(dst=${this.dst}, src=${this.src})`;
        }
    }

    abstract payload(): Uint8Array;
    abstract getTypeCode(): number;

    setSRC(value: number): void {
        this.src = value;
    }

    static toHexString = (byteArray: Uint8Array): string => {
        return Array.prototype.map
            .call(byteArray, function (byte: any) {
                return ('0' + (byte & 0xff).toString(16)).slice(-2);
            })
            .join(' ');
    };

    static convert_from_cp1251 = (payload: Uint8Array): string => {
        const decoder = new TextDecoder('windows-1251');
        return decoder.decode(payload);
    };

    static convert_to_cp1251 = (textConfig: string): Uint8Array => {
        return iconv.encode(textConfig, 'win1251');
    };

    toBinary(): Uint8Array {
        const payload: Uint8Array = this.payload();
        const typeCode: number = this.getTypeCode();
        const crc: Uint8Array = this.zcrc16(
            new Uint8Array([
                this.dst,
                this.src,
                payload.length + 1,
                typeCode,
                ...payload,
            ])
        );
        if (payload.length === 0) {
            throw new EmptyMessage('Message with length == 0');
        }
        return new Uint8Array([
            ...this.signature,
            this.dst,
            this.src,
            //
            payload.length + 1,
            typeCode,
            ...payload,
            ...crc, 
        ]);
        // const address = new Uint8Array([this.src, this.dst]);
        // return new Uint8Array([...this.signature, this.src, this.dst]);
    }

    zcrc16(data: Uint8Array): Uint8Array {
        let crc = 0;
        for (let i = 0; i < data.byteLength; i++) {
            crc += data[i] ^ 0xff;
            crc += data[i] << 8;
        }
        return new Uint8Array([crc & 0xff, (crc >> 8) & 0xff]);
    }

    view2uint8(data: DataView): Uint8Array {
        const uint8 = new Uint8Array(data.byteLength);
        for (let i = 0; i < data.byteLength; i++) {
            uint8[i] = data.getUint8(i);
        }
        return uint8;
    }

    static fromBinary(data: Uint8Array): Message {
        const signature: Uint8Array = data.slice(0, 3);
        const dst: number = data[4];
        const src: number = data[5];
        const msgLength: number = data[6];
        const typecode: number = data[7];
        const payload: Uint8Array = data.slice(8, 8 + msgLength - 1);
        const crc: Uint8Array = data.slice(8 + msgLength - 1);
        const msgClass: Message = typeCode2Class[typecode](payload, dst, src);
        const crcCheck: Uint8Array = msgClass.zcrc16(
            new Uint8Array([dst, src, payload.length + 1, typecode, ...payload as any])
        );
        const isResponceValid: boolean =
            crcCheck[0] === crc[0] && crcCheck[1] === crc[1];
        if (!isResponceValid) {
            throw new InvalidCRC('Invalid CRC or encryption key');
        }
        return msgClass;
    }

    // static getMessageError(errorCode: number): void {
    //     if (errorCode !== FileError.OK) {
    //         throw new MessageError(FileError[errorCode]);
    //     }
    // }
}

export class TextMessage extends Message {
    constructor(public readonly message: string, src = 0, dst = 0) {
        super(src, dst);
    }

    toString(): string {
        return super.bin2String(this.message);
    }

    payload(): Uint8Array {
        const encoder: TextEncoder = new TextEncoder();
        return encoder.encode(this.message);
    }

    getTypeCode(): number {
        return MessageTypes.TEXT_MESSAGE;
    }

    static fromPayload(payload: Uint8Array, src: number, dst: number): TextMessage {
        return new TextMessage(Message.convert_from_cp1251(payload), src, dst);
    }
}

export enum FileMode {
    Read = 1 << 0,
    Write = 1 << 1,
    CreateNew = 1 << 2,
    CreateAlways = 1 << 3,
    OpenAlways = 1 << 4,
    CheckMD5 = 1 << 5,
}

const FileModeToString = (mode: number): string => {
    const flags: [number, string][] = [
        [FileMode.Read, 'r'],
        [FileMode.Write, 'w'],
        [FileMode.CreateNew, 'cn'],
        [FileMode.CreateAlways, 'ca'],
        [FileMode.OpenAlways, 'oa'],
        [FileMode.CheckMD5, 'md5'],
    ];

    const right = flags.map((flag) => {
        if ((mode & flag[0]) !== 0) {
            return flag[1];
        }
        return null;
    });
    return `[${right.join(',')}]`;
};

enum MessageTypes {
    STREAM_CHUNK = 0x14,
    TEXT_MESSAGE = 0x20,
    STORAGE_ADDRESS_REQUEST = 0x30,
    STORAGE_ADDRESS,
    STORAGE_REQUEST,
    STORAGE_CONTENT,
    SIMPLE_FILE_WRITE = 0x36,
    SIMPLE_FILE_WRITE_RESPONSE,
    SIMPLE_FILE_WRITE_NO_ACK,
    FILE_OPEN = 0x40,
    FILE_OPEN_RESPONSE,
    FILE_CLOSE,
    FILE_CLOSE_RESPONSE,
    FILE_WRITE,
    FILE_WRITE_RESPONSE,
    FILE_WRITE_NO_ACK,
    FILE_WRITE_NO_ACK_RESPONSE,
    FILE_READ,
    FILE_CONTENT,
    FILE_LIST,
    FILE_LIST_ITEM,
    FILE_DELETE,
    FILE_DELETE_RESPONSE,
    FOLDER_CREATE,
    FOLDER_CREATE_RESPONSE,
    REBOOT,
    RX_SIZE = 0x52,
    RX_COUNT = 0x54,
    FORMAT_FILE_SYSTEM = 0x56,
    FORMAT_FILE_SYSTEM_RESPONSE,
    DISC_SPACE,
    DISC_SPACE_RESPONSE,
    SETUP_ENCRYPTION = 0x60,
    SETUP_ENCRYPTION_RESPONSE,
}

const typeCode2Class: Record<
    number,
    (payload: Uint8Array, dst: number, src: number) => Message
> = {
    [MessageTypes.TEXT_MESSAGE]: TextMessage.fromPayload,
};


export class FileOpen extends Message {
    constructor(
        public readonly fileName: string,
        public readonly mode: number,
        dst = 0,
        src = 0
    ) {
        super(dst, src);
    }

    toString(): string {
        return super.bin2String(
            `filename="${this.fileName}", mode=${FileModeToString(this.mode)}`
        );
    }

    payload(): Uint8Array {
        const encoder: TextEncoder = new TextEncoder();
        return new Uint8Array([...encoder.encode(this.fileName), 0, this.mode]);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_OPEN;
    }

    getTypeCodeAnswer(): number {
        return MessageTypes.FILE_OPEN_RESPONSE;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileOpen {
        const name = payload.slice(0, -2);
        const mode = payload[-1];
        return new FileOpen(Message.convert_from_cp1251(name), mode, dst, src);
    }
}

export enum FileError {
    OK = 0,
    DiskErr = 1,
    IntErr = 2,
    NotReady = 3,
    NoFile = 4,
    NoPath = 5,
    InvalidName = 6,
    Denied = 7,
    Exist = 8,
    InvalidObject = 9,
    WriteProtected = 10,
    InvalidDrive = 11,
    NotEnabled = 12,
    NoFileSystem = 13,
    MKFSAborted = 14,
    TimeOut = 15,
    Locked = 16,
    NotEnoughCore = 17,
    TooManyOpenFiles = 18,
    InvalidPosition = 128,
}

export const FileErrorToString = (error: number): string => {
    const errorType = FileError[error];
    if (errorType) {
        return errorType;
    } else {
        return 'UNKNOWN';
    }
};

export class FileOpenResponse extends Message {
    constructor(
        public readonly errorCode: number,
        public readonly handle: number,
        public readonly fileSize: number,
        dst: number,
        src: number
    ) {
        super(dst, src);
    }

    toString(): string {
        if (this.errorCode !== FileError.OK) {
            return super.bin2String(`"error=${FileErrorToString(this.errorCode)}"`);
        } else {
            return super.bin2String(
                `"handle=0x${this.handle.toString(
                    16
                )}, size=${this.fileSize.toString()}"`
            );
        }
    }

    payload(): Uint8Array {
        const buffer = new ArrayBuffer(6);
        const view = new DataView(buffer);
        view.setUint8(0, this.errorCode);
        view.setUint8(1, this.handle);
        view.setUint32(2, this.fileSize, true);
        return this.view2uint8(view);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_OPEN_RESPONSE;
    }

    static fromPayload(
        payload: Uint8Array,
        dst: number,
        src: number
    ): FileOpenResponse {
        const errorCode = payload[0];
        // Message.getMessageError(errorCode);
        const handle = payload[1];
        const dataView = new DataView(payload.buffer, 2);
        const fileSize = dataView.getUint32(0, true);
        return new FileOpenResponse(errorCode, handle, fileSize, dst, src);
    }
}

export class FileClose extends Message {
    constructor(public readonly handle: number, dst = 0, src = 0) {
        super(dst, src);
    }

    toString(): string {
        return super.bin2String(`"handle=0x${this.handle.toString(16)}"`);
    }

    payload(): Uint8Array {
        return new Uint8Array([this.handle]);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_CLOSE;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileClose {
        const handle = payload[0];
        return new FileClose(handle, dst, src);
    }
}

export class FileCloseResponse extends Message {
    constructor(public readonly errorCode: number, dst: number, src: number) {
        super(dst, src);
    }

    toString(): string {
        if (this.errorCode !== FileError.OK) {
            return super.bin2String(`"error=${FileErrorToString(this.errorCode)}"`);
        } else {
            return super.bin2String(null);
        }
    }

    payload(): Uint8Array {
        return new Uint8Array([this.errorCode]);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_CLOSE_RESPONSE;
    }

    static fromPayload(
        payload: Uint8Array,
        dst: number,
        src: number
    ): FileCloseResponse {
        const errorCode = payload[0];
        // Message.getMessageError(errorCode);
        return new FileCloseResponse(errorCode, dst, src);
    }
}

export class FileWrite extends Message {
    constructor(
        public readonly handle: number,
        public readonly position: number,
        public readonly data: Uint8Array,
        dst = 0,
        src = 0
    ) {
        super(dst, src);
    }

    toString(): string {
        return super.bin2String(
            `"handle=0x${this.handle.toString(
                16
            )}, position=${this.position.toString()},
            data=..., len=${this.data.byteLength}"`
        );
    }

    payload(): Uint8Array {
        const buffer = new ArrayBuffer(5);
        const view = new DataView(buffer);
        view.setUint8(0, this.handle);
        view.setUint32(1, this.position, true);
        const uint8 = this.view2uint8(view);
        return new Uint8Array([...uint8, ...this.data]);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_WRITE;
    }

    getTypeCodeAnswer(): number {
        return MessageTypes.FILE_WRITE_RESPONSE;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileWrite {
        const handle = payload[0];
        const dataView = new DataView(payload.buffer, 1, 4);
        const position = dataView.getUint32(0, true);
        const data = payload.slice(5);
        return new FileWrite(handle, position, data, dst, src);
    }
}

export class FileWriteResponse extends Message {
    constructor(
        public readonly errorCode: number,
        public readonly handle: number,
        public readonly position: number,
        public readonly length: number,
        dst: number,
        src: number
    ) {
        super(dst, src);
    }

    toString(): string {
        if (this.errorCode !== FileError.OK) {
            return super.bin2String(`"error=${FileErrorToString(this.errorCode)}"`);
        } else {
            return super.bin2String(
                `"handle=0x${this.handle.toString(
                    16
                )}, position=${this.position.toString()}, 
                length = ${this.length.toString()}"`
            );
        }
    }

    payload(): Uint8Array {
        const buffer = new ArrayBuffer(10);
        const view = new DataView(buffer);
        view.setUint8(0, this.errorCode);
        view.setUint8(1, this.handle);
        view.setUint32(2, this.position, true);
        view.setUint32(6, this.length, true);
        return this.view2uint8(view);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_WRITE_RESPONSE;
    }

    static fromPayload(
        payload: Uint8Array,
        dst: number,
        src: number
    ): FileWriteResponse {
        const errorCode = payload[0];
        // Message.getMessageError(errorCode);
        const handle = payload[1];
        const dataView = new DataView(payload.buffer, 2);
        const position = dataView.getUint32(0, true);
        const length = dataView.getUint32(1, true);
        return new FileWriteResponse(errorCode, handle, position, length, dst, src);
    }
}

export class FileWriteNoAck extends FileWrite {
    getTypeCode(): number {
        return MessageTypes.FILE_WRITE_NO_ACK;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileWriteNoAck {
        const handle = payload[0];
        const dataView = new DataView(payload.buffer, 1, 4);
        const position = dataView.getUint32(0, true);
        const data = payload.slice(5);
        return new FileWriteNoAck(handle, position, data, dst, src);
    }
}

export class FileWriteNoAckResponse extends FileWriteResponse {
    getTypeCode(): number {
        return MessageTypes.FILE_WRITE_NO_ACK_RESPONSE;
    }

    static fromPayload(
        payload: Uint8Array,
        dst: number,
        src: number
    ): FileWriteNoAckResponse {
        const errorCode = payload[0];
        // Message.getMessageError(errorCode);
        const handle = payload[1];
        const dataView = new DataView(payload.buffer, 2);
        const position = dataView.getUint32(0, true);
        const length = dataView.getUint32(1, true);
        return new FileWriteNoAckResponse(
            errorCode,
            handle,
            position,
            length,
            dst,
            src
        );
    }
}

export class FileRead extends Message {
    constructor(
        public readonly handle: number,
        public readonly position: number,
        public readonly length: number,
        dst = 0,
        src = 0
    ) {
        super(dst, src);
    }

    toString(): string {
        return super.bin2String(
            `"handle=0x${this.handle.toString(
                16
            )}, position=${this.position.toString()},
            len=${this.length.toString()}"`
        );
    }

    payload(): Uint8Array {
        const buffer = new ArrayBuffer(9);
        const view = new DataView(buffer);
        view.setUint8(0, this.handle);
        view.setUint32(1, this.position, true);
        view.setUint32(5, this.length, true);
        return this.view2uint8(view);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_READ;
    }

    getTypeCodeAnswer(): number {
        return MessageTypes.FILE_CONTENT;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileRead {
        const handle = payload[0];
        const dataView = new DataView(payload.buffer, 1, 8);
        const position = dataView.getUint32(0, true);
        const length = dataView.getUint32(1, true);
        return new FileRead(handle, position, length, dst, src);
    }
}

export class FileContent extends Message {
    constructor(
        public readonly errorCode: number,
        public readonly handle: number,
        public readonly position: number,
        public data: Uint8Array,
        dst: number,
        src: number
    ) {
        super(dst, src);
    }

    toString(): string {
        if (this.errorCode !== FileError.OK) {
            return super.bin2String(`"handle=0x${this.handle.toString(
                16
            )}, position=${this.position.toString()}, 
            error=${FileErrorToString(this.errorCode)}"`);
        } else {
            return super.bin2String(
                `"handle=0x${this.handle.toString(
                    16
                )}, position=${this.position.toString()}, 
                data..., length = ${this.data.byteLength}"`
            );
        }
    }

    payload(): Uint8Array {
        const buffer = new ArrayBuffer(6);
        const view = new DataView(buffer);
        view.setUint8(0, this.errorCode);
        view.setUint8(1, this.handle);
        view.setUint32(2, this.position, true);
        const uint8 = this.view2uint8(view);
        return new Uint8Array([...uint8, ...this.data]);
    }

    getTypeCode(): number {
        return MessageTypes.FILE_CONTENT;
    }

    static fromPayload(payload: Uint8Array, dst: number, src: number): FileContent {
        const errorCode = payload[0];
        // Message.getMessageError(errorCode);
        const handle = payload[1];
        const dataView = new DataView(payload.buffer, 2, 4);
        const position = dataView.getUint32(0, true);
        const data = payload.slice(6);
        return new FileContent(errorCode, handle, position, data, dst, src);
    }
}


export class MessageError extends Error {
    //Base class for message decoding errors
    constructor(message: string) {
        super(message);
        this.name = 'MessageError';
    }
}

class EmptyMessage extends MessageError {
    //Message with length == 0
    constructor(message: string) {
        super(message);
        this.name = 'EmptyMessage';
    }
}



class InvalidCRC extends MessageError {
    //Invalid CRC or encryption key
    constructor(message: string) {
        super(message);
        this.name = 'InvalidCRC';
    }
}