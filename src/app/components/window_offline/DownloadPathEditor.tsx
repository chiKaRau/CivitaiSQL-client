// DownloadPathEditor.tsx

import React, { useEffect, useRef, useState } from "react";
import { InputGroup, FormControl, Button, Form } from "react-bootstrap";
import { useDispatch } from "react-redux";
import {
    fetchGetFoldersList,
    fetchGetCategoryPrefixesList,
} from "../../api/civitaiSQL_api";

interface DownloadPathEditorProps {
    initialValue: string;
    isDarkMode: boolean;
    onSave: (nextPath: string) => void;
    onCancel: () => void;
}

const ROOT_PREFIX = "/@scan@/";

const DownloadPathEditor: React.FC<DownloadPathEditorProps> = ({
    initialValue,
    isDarkMode,
    onSave,
    onCancel,
}) => {
    // Value input (saved to backend)
    const [value, setValue] = useState(initialValue ?? "");

    // Builder input (prefix dropdown affects ONLY this) - starts empty
    const [builderValue, setBuilderValue] = useState("");

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [prefixsList, setPrefixsList] = useState<{
        id: number;
        prefixName: string;
        downloadFilePath: string;
        downloadPriority: number;
        createdAt?: string;
        updatedAt?: string;
    }[]>([]);
    const [selectedPrefix, setSelectedPrefix] = useState("");

    const [builderError, setBuilderError] = useState<string | null>(null);
    const [valueError, setValueError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dispatch = useDispatch();

    const normalizeToScanRoot = (p: string) => {
        const s = (p ?? "").trim();
        if (!s) return "";

        if (!s.startsWith("/")) {
            return ROOT_PREFIX + s.replace(/^\/+/, "");
        }
        if (!s.startsWith(ROOT_PREFIX)) {
            return ROOT_PREFIX + s.replace(/^\/+/, "");
        }
        return s;
    };

    const trimTrailingSlashes = (s: string) => (s ?? "").trim().replace(/\/+$/g, "");

    const validateScanRoot = (p: string) => {
        const trimmed = (p ?? "").trim();
        if (!trimmed) return "Path cannot be empty.";
        if (!trimmed.startsWith(ROOT_PREFIX)) return `Path must start with "${ROOT_PREFIX}"`;
        return null;
    };

    // Fetch folders + prefixes once on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [folders, prefixes] = await Promise.all([
                    fetchGetFoldersList(dispatch),
                    fetchGetCategoryPrefixesList(dispatch),
                ]);

                if (Array.isArray(folders)) {
                    const normalized = folders
                        .map((s) => normalizeToScanRoot(String(s)))
                        .filter(Boolean);
                    setSuggestions(Array.from(new Set(normalized)));
                } else {
                    console.warn("Unexpected fetchGetFoldersList result:", folders);
                    setSuggestions([]);
                }

                if (Array.isArray(prefixes)) {
                    setPrefixsList(prefixes);
                } else if (prefixes) {
                    console.warn("Unexpected fetchGetCategoriesPrefixsList result:", prefixes);
                    setPrefixsList([]);
                }
            } catch (err) {
                console.error("Error fetching folders/prefix list:", err);
                setSuggestions([]);
                setPrefixsList([]);
            }
        };

        load();
    }, [dispatch]);

    // Close editor if user clicks outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onCancel]);

    // Apply: copy builder -> value (validate builder)
    const handleApplyBuilderToValue = () => {
        const err = validateScanRoot(builderValue);
        if (err) {
            setBuilderError(err);
            return;
        }
        setBuilderError(null);
        setValue(builderValue.trim());
        setValueError(null);
    };

    // Update: save value -> backend (validate value)
    const handleUpdate = () => {
        const err = validateScanRoot(value);
        if (err) {
            setValueError(err);
            return;
        }
        setValueError(null);
        onSave(value.trim());
    };

    const handleKeyDownValue: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleUpdate();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    const handleKeyDownBuilder: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleApplyBuilderToValue();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    // Prefix dropdown ONLY edits builderValue
    // IMPORTANT: prefix dropdown values ALREADY include "/@scan@/" so we do NOT add it.
    const handlePrefixChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        const nextPrefixRaw = e.target.value; // expected like "/@scan@/SomePrefix" (already includes ROOT)
        const nextPrefixBase = trimTrailingSlashes(nextPrefixRaw);

        const prevPrefixBase = trimTrailingSlashes(selectedPrefix);
        const current = (builderValue ?? "").trim();

        // Preserve whatever user typed after the previous selected prefix
        // Example:
        //   prev = "/@scan@/A", current="/@scan@/A/sub/dir" -> tail="sub/dir"
        //   next = "/@scan@/B" -> builder becomes "/@scan@/B/sub/dir"
        let tail = "";
        if (prevPrefixBase && current.startsWith(prevPrefixBase)) {
            tail = current.slice(prevPrefixBase.length).replace(/^\/+/, "");
        } else if (current.startsWith(ROOT_PREFIX)) {
            // fallback: drop the first segment under /@scan@/
            const rest = current.slice(ROOT_PREFIX.length).replace(/^\/+/, "");
            const parts = rest.split("/").filter(Boolean);
            parts.shift();
            tail = parts.join("/");
        } else {
            tail = current.replace(/^\/+/, "");
        }

        setSelectedPrefix(nextPrefixRaw);

        // If user picked "(No prefix)" just don't change builderValue
        if (!nextPrefixBase) return;

        const nextBuilder = tail ? `${nextPrefixBase}/${tail}` : nextPrefixBase;
        setBuilderValue(nextBuilder);
        setBuilderError(null);
    };

    return (
        <div ref={containerRef} style={{ marginTop: 4 }}>
            {/* Builder row (NO autocomplete / datalist) */}
            <div style={{ marginBottom: 8 }}>
                <InputGroup size="sm">
                    <Form.Select
                        value={selectedPrefix}
                        onChange={handlePrefixChange}
                        style={{
                            maxWidth: 260,
                            backgroundColor: isDarkMode ? "#555" : "#fff",
                            color: isDarkMode ? "#fff" : "#000",
                            borderColor: isDarkMode ? "#777" : "#ccc",
                        }}
                    >
                        <option value="">(No prefix)</option>
                        {prefixsList.map((p) => (
                            <option key={`${p.prefixName}-${p.downloadFilePath}`} value={p.downloadFilePath}>
                                {p.prefixName}
                            </option>
                        ))}
                    </Form.Select>

                    <FormControl
                        value={builderValue}
                        placeholder="Build path…"
                        autoComplete="off"
                        onChange={(e) => {
                            setBuilderValue(e.target.value);
                            if (builderError) setBuilderError(null);
                        }}
                        onKeyDown={handleKeyDownBuilder}
                        isInvalid={!!builderError}
                        style={{
                            backgroundColor: isDarkMode ? "#555" : "#fff",
                            color: isDarkMode ? "#fff" : "#000",
                            borderColor: isDarkMode ? "#777" : "#ccc",
                        }}
                    />

                    <Button variant="primary" onClick={handleApplyBuilderToValue}>
                        Apply
                    </Button>
                </InputGroup>

                {builderError && (
                    <div
                        style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: isDarkMode ? "#ffb3b3" : "#b00020",
                        }}
                    >
                        {builderError}
                    </div>
                )}
            </div>

            {/* Value row (has datalist autocomplete) */}
            <InputGroup size="sm">
                <FormControl
                    autoFocus
                    value={value}
                    placeholder={`Type download path… (must start with ${ROOT_PREFIX})`}
                    list="download-path-options"
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (valueError) setValueError(null);
                    }}
                    onKeyDown={handleKeyDownValue}
                    isInvalid={!!valueError}
                    style={{
                        backgroundColor: isDarkMode ? "#555" : "#fff",
                        color: isDarkMode ? "#fff" : "#000",
                        borderColor: isDarkMode ? "#777" : "#ccc",
                    }}
                />

                <Button variant="success" onClick={handleUpdate}>
                    Update
                </Button>

                <Button variant="outline-secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </InputGroup>

            {valueError && (
                <div
                    style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: isDarkMode ? "#ffb3b3" : "#b00020",
                    }}
                >
                    {valueError}
                </div>
            )}

            <datalist id="download-path-options">
                {suggestions.map((s) => (
                    <option key={s} value={s} />
                ))}
            </datalist>
        </div>
    );
};

export default DownloadPathEditor;