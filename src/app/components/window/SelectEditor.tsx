import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export const SelectEditor = forwardRef((props: any, ref) => {
    const selRef = useRef<HTMLSelectElement | null>(null);
    const latestRef = useRef(String(props.value ?? 0));

    useEffect(() => {
        setTimeout(() => selRef.current?.focus(), 0);
    }, []);

    useImperativeHandle(ref, () => ({
        getValue: () => {
            const n = Number(latestRef.current);
            return Number.isFinite(n) ? n : 0;
        },
    }));

    const commit = (raw: string) => {
        latestRef.current = raw;

        const id = props.data?.id;
        const n = Number(raw);
        const next = Number.isFinite(n) ? n : 0;

        console.log("commit field= downloadPriority value=", next);

        // ✅ UPDATE YOUR STATE DIRECTLY (same idea as "hold")
        props.context?.patchStagedById?.(id, { downloadPriority: next });

        // ✅ close editor
        props.api.stopEditing(false);
    };

    return (
        <select
            ref={selRef}
            defaultValue={String(props.value ?? 0)}
            style={{ width: "100%", height: 32 }}
            onChange={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Escape") props.api.stopEditing(true);
                if (e.key === "Enter") props.api.stopEditing(false);
            }}
        >
            {(props.options ?? []).map((o: any) => {
                const s = String(o);
                return (
                    <option key={s} value={s}>
                        {s}
                    </option>
                );
            })}
        </select>
    );
});