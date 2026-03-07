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
    const [value, setValue] = useState(initialValue ?? "");
    const [suffixValue, setSuffixValue] = useState("");

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
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
    const trimLeadingSlashes = (s: string) => (s ?? "").trim().replace(/^\/+/g, "");

    const validateScanRoot = (p: string) => {
        const trimmed = (p ?? "").trim();
        if (!trimmed) return "Path cannot be empty.";
        if (!trimmed.startsWith(ROOT_PREFIX)) return `Path must start with "${ROOT_PREFIX}"`;
        return null;
    };

    const filteredSuggestions = suggestions
        .filter((s) => {
            const q = value.trim().toLowerCase();
            if (!q) return false;
            return s.toLowerCase().includes(q);
        })
        .slice(0, 8);

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
                    setSuggestions([]);
                }

                if (Array.isArray(prefixes)) {
                    setPrefixsList(prefixes);
                } else {
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

    const handlePrefixChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        setSelectedPrefix(e.target.value);
        if (builderError) setBuilderError(null);
    };

    const handleApplyBuilderToValue = () => {
        const prefix = trimTrailingSlashes(selectedPrefix);
        const suffix = trimLeadingSlashes(suffixValue);

        let combined = "";

        if (prefix && suffix) {
            combined = `${prefix}/${suffix}`;
        } else if (prefix) {
            combined = prefix;
        } else if (suffix) {
            combined = normalizeToScanRoot(suffix);
        } else {
            setBuilderError("Please select a prefix or enter a suffix.");
            return;
        }

        const err = validateScanRoot(combined);
        if (err) {
            setBuilderError(err);
            return;
        }

        setBuilderError(null);
        setValue(sanitizePath(combined));
        setValueError(null);
    };

    const sanitizePath = (p: string) =>
        (p ?? "").replace(/[<>:"\\|?*]/g, "");

    const handleUpdate = () => {
        const cleaned = sanitizePath(value).trim();

        const err = validateScanRoot(cleaned);
        if (err) {
            setValueError(err);
            return;
        }

        setValue(cleaned);      // so UI also reflects cleaned value
        setValueError(null);
        onSave(cleaned);
    };
    const handleKeyDownValue: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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

    return (
        <div
            ref={containerRef}
            style={{ marginTop: 4, position: "relative" }}
        >
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
                        value={suffixValue}
                        placeholder="Enter suffix…"
                        autoComplete="off"
                        onChange={(e) => {
                            setSuffixValue(e.target.value);
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FormControl
                    as="textarea"
                    rows={2}
                    autoFocus
                    value={value}
                    placeholder={`Type download path… (must start with ${ROOT_PREFIX})`}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setShowSuggestions(true);

                        if (valueError) setValueError(null);

                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    onKeyDown={handleKeyDownValue}
                    isInvalid={!!valueError}
                    style={{
                        backgroundColor: isDarkMode ? "#555" : "#fff",
                        color: isDarkMode ? "#fff" : "#000",
                        borderColor: isDarkMode ? "#777" : "#ccc",
                        resize: "none",
                        overflow: "hidden",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        minHeight: 42,
                    }}
                />

                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                        data-no-select="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "100%",
                            zIndex: 9999,
                            marginTop: 4,
                            maxHeight: 220,
                            overflowY: "auto",
                            borderRadius: 8,
                            border: `1px solid ${isDarkMode ? "#666" : "#ccc"}`,
                            backgroundColor: isDarkMode ? "#2b2b2b" : "#fff",
                            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                        }}
                    >
                        {filteredSuggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                data-no-select="true"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setValue(s);
                                    setShowSuggestions(false);
                                    if (valueError) setValueError(null);
                                }}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 10px",
                                    border: "none",
                                    background: "transparent",
                                    color: isDarkMode ? "#fff" : "#000",
                                    cursor: "pointer",
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                }}
                                title={s}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="success" onClick={handleUpdate}>
                        Update
                    </Button>

                    <Button variant="outline-secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>

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
        </div>
    );
};

export default DownloadPathEditor;