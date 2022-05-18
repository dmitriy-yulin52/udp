/**
 * @function
 * @param list: массив элементов, которые могут быть null | undefined
 * @return чистый массив из элементов
 */
 export function removeNulls<T>(list: (T | null | undefined)[]): T[] {
    return list.filter((x): x is T => x != null);
}