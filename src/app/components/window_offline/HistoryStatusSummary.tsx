import React, { useEffect, useState } from "react";
import { Badge, Spinner } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { fetchModelOfflineDownloadHistoryStatusSummary } from "../../api/civitaiSQL_api";
import { ModelOfflineDownloadHistoryStatusSummary } from "./OfflineWindow.types";

type HistoryStatusSummaryProps = {
    selectedDate: string;
    isDarkMode: boolean;
    reloadToken: number;
};

const emptySummary: ModelOfflineDownloadHistoryStatusSummary = {
    totalCount: 0,
    localPathNaCount: 0,
    errorCount: 0,
    normalCount: 0,
};

const HistoryStatusSummary: React.FC<HistoryStatusSummaryProps> = ({
    selectedDate,
    isDarkMode,
    reloadToken,
}) => {
    const dispatch = useDispatch();

    const [summary, setSummary] = useState<ModelOfflineDownloadHistoryStatusSummary>(emptySummary);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadSummary = async () => {
            setIsLoading(true);
            setHasError(false);

            try {
                const result = await fetchModelOfflineDownloadHistoryStatusSummary(
                    dispatch,
                    selectedDate
                );

                if (cancelled) return;

                setSummary(result);
            } catch {
                if (cancelled) return;

                setSummary(emptySummary);
                setHasError(true);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadSummary();

        return () => {
            cancelled = true;
        };
    }, [dispatch, selectedDate, reloadToken]);

    const badgeStyle: React.CSSProperties = {
        fontSize: "12px",
        padding: "6px 9px",
        border: `1px solid ${isDarkMode ? "#4b5563" : "#d1d5db"}`,
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
                color: isDarkMode ? "#f9fafb" : "#111827",
                fontSize: "12px",
                marginTop: "2px",
            }}
        >
            {isLoading && (
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: isDarkMode ? "#d1d5db" : "#374151",
                    }}
                >
                    <Spinner animation="border" size="sm" />
                    Loading status...
                </span>
            )}

            {!isLoading && hasError && (
                <Badge bg="danger" style={badgeStyle}>
                    Status failed
                </Badge>
            )}

            {!isLoading && !hasError && (
                <>
                    <Badge bg="secondary" style={badgeStyle}>
                        Total: {summary.totalCount}
                    </Badge>

                    <Badge bg="warning" text="dark" style={badgeStyle}>
                        Local Path N/A: {summary.localPathNaCount}
                    </Badge>

                    <Badge bg="danger" style={badgeStyle}>
                        Is Error: {summary.errorCount}
                    </Badge>

                    <Badge bg="success" style={badgeStyle}>
                        Normal: {summary.normalCount}
                    </Badge>
                </>
            )}
        </div>
    );
};

export default HistoryStatusSummary;