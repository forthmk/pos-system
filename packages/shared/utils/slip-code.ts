/* ──────────────────────────────────────────────────────────────────────────
 * The kiosk slip's barcode (design §7.11): 12 digits, printed as Code 128.
 *
 *   01 000748 527 8
 *   │  │      │   └ check digit — mod-10 (Luhn) of the first 11, catches a
 *   │  │      │     bad read or a typing mistake
 *   │  │      └──── slip code — orders.slip_token, random per order
 *   │  └─────────── order number — orders.order_number
 *   └────────────── store — stores.code
 *
 * Used by the API (scan lookup) and the web (printing the slip, checking a
 * scan before asking the server).
 * ────────────────────────────────────────────────────────────────────────── */

export function luhnDigit(body: string): string {
    let sum = 0;
    [...body].reverse().forEach((ch, i) => {
        let d = Number(ch);
        if (i % 2 === 0) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    });
    return String((10 - (sum % 10)) % 10);
}

/** '010007485278' — what the barcode holds. */
export function slipCode(storeCode: string, orderNumber: number, slipToken: string): string {
    const body = `${storeCode.padStart(2, '0').slice(-2)}${String(orderNumber).padStart(6, '0')}${slipToken.padStart(3, '0')}`;
    return body + luhnDigit(body);
}

/** '01-000748-527-8' — printed under the barcode, for typing by hand. */
export const formatSlipCode = (code: string) => `${code.slice(0, 2)}-${code.slice(2, 8)}-${code.slice(8, 11)}-${code.slice(11)}`;

export interface ParsedSlipCode {
    code: string;
    store: string;
    orderNumber: number;
    slipToken: string;
}

/** Dashes / spaces removed; 12 digits with the right check digit, else null. */
export function parseSlipCode(raw: string): ParsedSlipCode | null {
    const code = raw.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(code) || luhnDigit(code.slice(0, 11)) !== code[11]) return null;
    return { code, store: code.slice(0, 2), orderNumber: Number(code.slice(2, 8)), slipToken: code.slice(8, 11) };
}
