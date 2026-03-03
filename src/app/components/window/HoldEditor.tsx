import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export const HoldEditor = forwardRef((props: any, ref) => {

    console.log("HoldEditor mounted")

    const [val, setVal] = useState(props.value ? "1" : "0");
    const selRef = useRef<HTMLSelectElement | null>(null);

    useEffect(() => {
        setTimeout(() => selRef.current?.focus(), 0);
    }, []);

    useImperativeHandle(ref, () => ({
        getValue: () => val === "1",   // ✅ boolean
    }));

    return (
        <select
            ref={selRef as any}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ width: "100%", height: 32 }}
        >
            <option value="0">N</option>
            <option value="1">Y</option>
        </select>
    );
});