import React from "react";
import { Button, Form } from "react-bootstrap";

type Props = {
    value: string;
    isDarkMode: boolean;
    onChange: (value: string) => void;
    onSave: () => void | Promise<void>;
    onCancel: () => void;
};

const VersionIdEditor = ({
    value,
    isDarkMode,
    onChange,
    onSave,
    onCancel,
}: Props) => {
    return (
        <span
            data-no-select="true"
            onClick={(e) => e.stopPropagation()}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
            }}
        >
            <Form.Control
                size="sm"
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    e.stopPropagation();

                    if (e.key === "Enter") {
                        onSave();
                    } else if (e.key === "Escape") {
                        onCancel();
                    }
                }}
                style={{
                    width: 140,
                    display: "inline-block",
                    backgroundColor: isDarkMode ? "#333" : "#fff",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ced4da",
                }}
                autoFocus
            />

            <Button
                type="button"
                size="sm"
                variant="success"
                data-no-select="true"
                onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                }}
            >
                Apply
            </Button>

            <Button
                type="button"
                size="sm"
                variant="secondary"
                data-no-select="true"
                onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                }}
            >
                Cancel
            </Button>
        </span>
    );
};

export default VersionIdEditor;