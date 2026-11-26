import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// A Code 128 barcode as SVG (the kiosk slip code, design §7.11). 12 digits use
// Code 128's compact number set, so it stays short enough for an 80 mm slip.
const Barcode = ({ value, height = 70, className = '' }: { value: string; height?: number; className?: string }) => {
    const ref = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (ref.current) JsBarcode(ref.current, value, { format: 'CODE128C', displayValue: false, height, width: 2.4, margin: 0 });
    }, [value, height]);
    return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} className={className} />;
};

export default Barcode;
