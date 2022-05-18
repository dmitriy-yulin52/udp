import {List, Map} from 'immutable';
import { AnyObjectId } from './z3kConfig';
export type PrimitiveValidationResult = string | null;
export type ValidationResult<T> =
    | PrimitiveValidationResult
    | (T extends Array<infer V>
          ? ReadonlyArray<ValidationResult<V>>
          : T extends ReadonlyArray<infer V>
          ? ReadonlyArray<ValidationResult<V>>
          : T extends List<infer V>
          ? List<ValidationResult<V>>
          : T extends Map<infer K, infer V>
          ? Map<K, ValidationResult<V>> // : T extends AnyObjectId // ? PrimitiveValidationResult
          : T extends Readonly<object>
          ? T extends AnyObjectId
              ? never
              : {readonly [K in keyof T]?: ValidationResult<T[K]>}
          : never);