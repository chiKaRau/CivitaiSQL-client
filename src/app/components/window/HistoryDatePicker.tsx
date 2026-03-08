import React, { forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface HistoryDatePickerProps {
    selectedDate: string;
    onChangeDate: (dateStr: string) => void;
    availableDates?: string[];
    isDarkMode: boolean;
    onMonthChange?: (date: Date) => void;
}

function toLocalYmd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseLocalYmd(s: string): Date | null {
    if (!s) return null;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;

    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
}

type PickerButtonProps = {
    value?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    isDarkMode?: boolean;
};

const PickerButton = forwardRef<HTMLButtonElement, PickerButtonProps>(
    ({ value, onClick, isDarkMode }, ref) => (
        <button
            type="button"
            onClick={onClick}
            ref={ref}
            style={{
                minWidth: "180px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                color: isDarkMode ? "#ffffff" : "#111111",
                fontWeight: 700,
                cursor: "pointer",
            }}
        >
            {value}
        </button>
    )
);

PickerButton.displayName = "PickerButton";

const HistoryDatePicker: React.FC<HistoryDatePickerProps> = ({
    selectedDate,
    onChangeDate,
    availableDates = [],
    isDarkMode,
    onMonthChange,
}) => {
    const selected = parseLocalYmd(selectedDate);

    const highlightedDates = availableDates
        .map(parseLocalYmd)
        .filter((d): d is Date => d !== null);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "12px",
                position: "relative",
            }}
        >
            <style>
                {`
                    .history-datepicker-popper {
                        z-index: 3000 !important;
                    }

                    .history-datepicker {
                        background: ${isDarkMode ? "#1f2937" : "#ffffff"} !important;
                        border: 1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"} !important;
                        color: ${isDarkMode ? "#f9fafb" : "#111827"} !important;
                        font-family: inherit;
                    }

                    .history-datepicker .react-datepicker__header {
                        background: ${isDarkMode ? "#111827" : "#f8fafc"} !important;
                        border-bottom: 1px solid ${isDarkMode ? "#374151" : "#e5e7eb"} !important;
                    }

                    .history-datepicker .react-datepicker__current-month,
                    .history-datepicker .react-datepicker-time__header,
                    .history-datepicker .react-datepicker-year-header {
                        color: ${isDarkMode ? "#ffffff" : "#111827"} !important;
                        font-weight: 700 !important;
                    }

                    .history-datepicker .react-datepicker__day-name {
                        color: ${isDarkMode ? "#d1d5db" : "#374151"} !important;
                        font-weight: 600 !important;
                    }

                    .history-datepicker .react-datepicker__day,
                    .history-datepicker .react-datepicker__time-name {
                        color: ${isDarkMode ? "#f3f4f6" : "#111827"} !important;
                        font-weight: 500 !important;
                        border-radius: 999px !important;
                    }

                    .history-datepicker .react-datepicker__day:hover {
                        background-color: ${isDarkMode ? "#374151" : "#e5e7eb"} !important;
                        color: ${isDarkMode ? "#ffffff" : "#111827"} !important;
                        border-radius: 999px !important;
                    }

                    .history-datepicker .react-datepicker__day--keyboard-selected {
                        background-color: ${isDarkMode ? "#2563eb" : "#93c5fd"} !important;
                        color: #ffffff !important;
                        border-radius: 999px !important;
                    }

                    .history-datepicker .react-datepicker__day--selected,
                    .history-datepicker .react-datepicker__day--today.react-datepicker__day--selected {
                        background-color: #0d6efd !important;
                        color: #ffffff !important;
                        border-radius: 999px !important;
                        font-weight: 700 !important;
                    }

                    .history-datepicker .history-highlight {
                        background-color: ${isDarkMode ? "#16a34a" : "#86efac"} !important;
                        color: ${isDarkMode ? "#ffffff" : "#111827"} !important;
                        border-radius: 999px !important;
                        font-weight: 700 !important;
                    }

                    .history-datepicker .react-datepicker__day--today {
                        outline: 1px solid ${isDarkMode ? "#60a5fa" : "#2563eb"} !important;
                        font-weight: 700 !important;
                    }

                    .history-datepicker .react-datepicker__day--outside-month {
                        color: ${isDarkMode ? "#6b7280" : "#9ca3af"} !important;
                        opacity: 0.45 !important;
                    }

                    .history-datepicker .react-datepicker__day--disabled {
                        color: ${isDarkMode ? "#6b7280" : "#9ca3af"} !important;
                        opacity: 0.5 !important;
                    }

                    .history-datepicker .react-datepicker__navigation-icon::before {
                        border-color: ${isDarkMode ? "#ffffff" : "#111827"} !important;
                    }

                    .history-datepicker .react-datepicker__today-button {
                        background: ${isDarkMode ? "#e5e7eb" : "#f3f4f6"} !important;
                        color: #111827 !important;
                        border-top: 1px solid ${isDarkMode ? "#374151" : "#d1d5db"} !important;
                        font-weight: 700 !important;
                    }
                `}
            </style>

            <DatePicker
                selected={selected}
                onChange={(date: Date | null) => {
                    if (!date) return;
                    onChangeDate(toLocalYmd(date));
                }}
                onMonthChange={(date: Date) => {
                    onMonthChange?.(date);
                }}
                dateFormat="yyyy-MM-dd"
                highlightDates={[
                    {
                        "history-highlight": highlightedDates,
                    },
                ]}
                todayButton="Today"
                popperPlacement="bottom"
                popperClassName="history-datepicker-popper"
                calendarClassName="history-datepicker"
                customInput={<PickerButton isDarkMode={isDarkMode} />}
            />
        </div>
    );
};

export default HistoryDatePicker;