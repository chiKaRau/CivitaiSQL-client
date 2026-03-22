import React, { useEffect, useState } from "react";

// Components
import { BiUndo } from "react-icons/bi";
import Spinner from "react-bootstrap/Spinner";
import CollapsePanel from "./CollapsePanel";

// Store
import { useDispatch } from "react-redux";

// api
import { fetchDatabaseLatestAddedModelsPanel } from "../../api/civitaiSQL_api";

// theme
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";

// Interface
interface DatabaseLastestAddedModelsPanelProps {
    toggleDatabaseLastestAddedModelsPanelOpen: () => void;
    isDarkMode?: boolean;
}

const DatabaseLastestAddedModelsPanel: React.FC<DatabaseLastestAddedModelsPanelProps> = ({
    toggleDatabaseLastestAddedModelsPanelOpen,
    isDarkMode = true
}) => {
    const dispatch = useDispatch();
    const theme = isDarkMode ? darkTheme : lightTheme;

    const [modelsObject, setModelsObject] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        handleUpdateModelsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpdateModelsList = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDatabaseLatestAddedModelsPanel(dispatch);
            setModelsObject(data || {});
        } finally {
            setIsLoading(false);
        }
    };

    const panelCardStyle: React.CSSProperties = {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "10px",
        boxShadow: isDarkMode
            ? "0 6px 18px rgba(0,0,0,0.35)"
            : "0 6px 18px rgba(0,0,0,0.10)",
    };

    return (
        <div
            className="panel-container"
            style={{
                ...panelCardStyle,
                overflow: "hidden",
            }}
        >
            <button
                className="panel-close-button"
                onClick={toggleDatabaseLastestAddedModelsPanelOpen}
                style={{
                    backgroundColor: theme.headerBackgroundColor,
                    color: theme.headerFontColor,
                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                    borderRadius: "8px",
                    boxShadow: isDarkMode
                        ? "0 4px 12px rgba(0,0,0,0.25)"
                        : "0 4px 12px rgba(0,0,0,0.08)",
                }}
            >
                <BiUndo />
            </button>

            <div
                className="panel-container-content"
                style={{
                    backgroundColor: theme.panelBackground,
                    color: theme.panelText,
                }}
            >
                <div
                    className="panel-header-text"
                    style={{ color: theme.panelText }}
                >
                    <h6>Database&apos;s Latest Added Models Panel</h6>
                </div>

                {isLoading ? (
                    <div
                        className="centered-container"
                        style={{ color: theme.panelText }}
                    >
                        <Spinner animation="border" style={{ color: theme.headerFontColor }} />
                    </div>
                ) : (
                    <>
                        {Object.entries(modelsObject).map(([key, value]) => (
                            <CollapsePanel
                                key={key}
                                collectionName={key}
                                modelsList={value}
                                isDarkMode={isDarkMode}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default DatabaseLastestAddedModelsPanel;