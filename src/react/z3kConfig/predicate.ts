export type Predicate<T> = (x: T) => boolean;

export function and<T>(pred1: Predicate<T>, pred2: Predicate<T>): Predicate<T> {
    return (x: T): boolean => pred1(x) && pred2(x);
}

function or<T>(pred1: Predicate<T>, pred2: Predicate<T>): Predicate<T> {
    return (x: T): boolean => pred1(x) || pred2(x);
}