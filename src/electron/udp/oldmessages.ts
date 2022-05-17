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
                ...payload as any,
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
            ...payload as any,
            ...crc as any, 
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