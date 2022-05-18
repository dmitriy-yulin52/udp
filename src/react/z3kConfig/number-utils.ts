

export function prettyFloat(
    value: number | null | undefined,
    precision: number | null = 6
): string {
    if (value == null) return '';

    const str = precision != null ? value.toFixed(precision) : value.toString();

    return str.replace(/([,.]\d*?)0+$/, '$1').replace(/\.$/, '');
}