// DownloadPathEditor.tsx

import React, { useEffect, useRef, useState } from "react";
import { InputGroup, FormControl, Button } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { fetchGetFoldersList } from "../../api/civitaiSQL_api";

interface DownloadPathEditorProps {
    initialValue: string;
    isDarkMode: boolean;
    onSave: (nextPath: string) => void;
    onCancel: () => void;
}

const DownloadPathEditor: React.FC<DownloadPathEditorProps> = ({
    initialValue,
    isDarkMode,
    onSave,
    onCancel,
}) => {
    const [value, setValue] = useState(initialValue ?? "");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dispatch = useDispatch();

    // Fetch folders list once on mount
    useEffect(() => {
        const loadFolders = async () => {
            try {
                const data = await fetchGetFoldersList(dispatch);
                if (Array.isArray(data)) {
                    setSuggestions(data);
                } else {
                    console.warn("Unexpected fetchGetFoldersList result:", data);
                    setSuggestions([]);
                }
            } catch (err) {
                console.error("Error fetching folders list:", err);
                setSuggestions([]);
            }
        };

        loadFolders();
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

    const handleSave = () => {
        const trimmed = value.trim();
        if (!trimmed) {
            onCancel();
            return;
        }
        onSave(trimmed);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div ref={containerRef} style={{ marginTop: 4 }}>
            <InputGroup size="sm">
                <FormControl
                    autoFocus
                    value={value}
                    placeholder="Type download path…"
                    list="download-path-options"
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        backgroundColor: isDarkMode ? "#555" : "#fff",
                        color: isDarkMode ? "#fff" : "#000",
                        borderColor: isDarkMode ? "#777" : "#ccc",
                    }}
                />
                <Button variant="success" onClick={handleSave}>
                    Apply
                </Button>
                <Button variant="outline-secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </InputGroup>

            <datalist id="download-path-options">
                {suggestions.map((s) => (
                    <option key={s} value={s} />
                ))}
            </datalist>
        </div>
    );
};

export default DownloadPathEditor;
