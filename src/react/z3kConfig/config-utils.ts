import { AnyObjectId } from "./z3kConfig";

export enum Author {
    INVALID = 0,
    DEVICE = 1,
    WEB = 2,
    USB_UTILITY = 3,
    TEMPORARY = 4,
    PREDEFINED = 5,
}

export function getAuthorValue(authorId: number): number {
    return authorId << 12;
}

export function getAuthor(id: AnyObjectId): Author {
    return id >> 12;
}

export function isAuthor(id: AnyObjectId, authorId: number): boolean {
    return (id & (0xf << 12)) === getAuthorValue(authorId);
}

export function seemsLikeObjectId(num: unknown): num is AnyObjectId {
    return typeof num == 'number' && getAuthor(num as AnyObjectId) > 0;
}

