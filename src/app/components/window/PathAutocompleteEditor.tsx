import React, {
    useMemo,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
    useEffect,
} from "react";
import type { ICellEditorParams } from "ag-grid-community";
import { Button, FormControl } from "react-bootstrap";

type PathEditorParams = ICellEditorParams & { options: string[] };

export const PathAutocompleteEditor = forwardRef<any, PathEditorParams>((props, ref) => {
    const startValue = props.value ?? "";
    const latestRef = useRef(String(startValue));

    const [val, setVal] = useState(String(startValue));
    const inputRef = useRef<HTMLInputElement | null>(null);

    const field =
        props?.column?.getColDef?.()?.field ||
        (props as any)?.colDef?.field ||
        "downloadFilePath";

    const listId = useMemo(
        () => `folders-datalist-${props.column.getId()}-${props.rowIndex}`,
        [props.column, props.rowIndex]
    );

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    useImperativeHandle(ref, () => ({
        getValue: () => latestRef.current,
        isCancelAfterEnd: () => false,
    }));

    const commit = () => {
        const latest = inputRef.current?.value ?? "";
        const id = props.data?.id;

        console.log("commit field= downloadFilePath value=", latest);

        // ✅ UPDATE YOUR STATE DIRECTLY
        props.context?.patchStagedById?.(id, { downloadFilePath: latest });

        // ✅ close editor
        props.api.stopEditing(false);
    };

    const cancel = () => props.api.stopEditing(true);

    return (
        <div style={{ padding: 6, width: "100%" }}>
            <FormControl
                ref={inputRef as any}
                value={val}
                onChange={(e) => {
                    setVal(e.target.value);
                    latestRef.current = e.target.value;
                }}
                list={listId}
                placeholder="Pick or type a folder path…"
                style={{ width: "100%" }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") cancel();
                }}
            />

            <datalist id={listId}>
                {(props.options ?? []).map((opt) => (
                    <option key={opt} value={opt} />
                ))}
            </datalist>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {/* ✅ onMouseDown prevents stopEditingWhenCellsLoseFocus from killing the click */}
                <Button
                    size="sm"
                    variant="primary"
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        commit();
                    }}
                >
                    Apply
                </Button>

                <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cancel();
                    }}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
});