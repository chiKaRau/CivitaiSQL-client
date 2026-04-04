import React, { useEffect, useState } from "react";

// Components
import { Toast, Badge, Carousel, Button, FormControl, InputGroup } from "react-bootstrap";
import Col from "react-bootstrap/Col";
import { BiUndo } from "react-icons/bi";
import { BsArrowRepeat, BsSortDown, BsSortUp, BsType } from "react-icons/bs";
import Spinner from "react-bootstrap/Spinner";

// Store
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../store/configureStore";
import { setError, clearError } from "../../store/actions/errorsActions";

// api
import {
    fetchDatabaseRelatedModelsByTagsList
} from "../../api/civitaiSQL_api";

// util
import { retrievePossibleCombination } from "../../utils/stringUtils";

// theme
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import SmartImage from "../window_offline/SmartImage";

// Interface
interface DatabaseRelatedModelsPanelProps {
    toggleDatabaseRelatedModelsPanelOpen: () => void;
    isDarkMode?: boolean;
}

type RelatedModel = {
    name: string;
    url: string;
    id: number;
    modelNumber?: string;
    versionNumber?: string;
    baseModel: string;
    imageUrls: { url: string; height: number; width: number; nsfw: string }[];
};

const DatabaseRelatedModelsPanel: React.FC<DatabaseRelatedModelsPanelProps> = ({
    toggleDatabaseRelatedModelsPanelOpen,
    isDarkMode = true
}) => {
    const dispatch = useDispatch();
    const theme = isDarkMode ? darkTheme : lightTheme;

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);

    const [originalModelsList, setOriginalModelsList] = useState<RelatedModel[]>([]);
    const [modelsList, setModelsList] = useState<RelatedModel[]>([]);
    const [hiddenToastIds, setHiddenToastIds] = useState<number[]>([]);
    const [possibleCombinationTags, setPossibleCombinationTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isSorted, setIsSorted] = useState(false);
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string; display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);

    const data: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const modelName = data?.name ?? "";
    const modelTags = [
        ...(data?.tags ?? []),
        ...((data?.modelVersions ?? []).map((version: { name: string }) => version.name))
    ];

    const inputTokens = inputValue
        .split(/,\s*|\s+/)
        .map(tag => tag.trim())
        .filter(Boolean);

    const panelCardStyle: React.CSSProperties = {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "10px",
        boxShadow: isDarkMode
            ? "0 6px 18px rgba(0,0,0,0.35)"
            : "0 6px 18px rgba(0,0,0,0.10)",
    };

    const baseButtonStyle: React.CSSProperties = {
        backgroundColor: theme.headerBackgroundColor,
        color: theme.headerFontColor,
        border: `1px solid ${theme.evenRowBackgroundColor}`,
        borderRadius: "8px",
        minHeight: "44px",
        minWidth: "46px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isDarkMode
            ? "0 4px 12px rgba(0,0,0,0.25)"
            : "0 4px 12px rgba(0,0,0,0.08)",
    };

    const applyFiltersToModels = (
        sourceList: RelatedModel[],
        nextBaseModelList: { baseModel: string; display: boolean }[],
        nextIsSorted: boolean
    ) => {
        const filtered = [...sourceList].filter(model =>
            nextBaseModelList.some(
                baseModelObj => baseModelObj.baseModel === model.baseModel && baseModelObj.display
            )
        );

        setModelsList(nextIsSorted ? [...filtered].reverse() : filtered);
    };

    useEffect(() => {
        setPossibleCombinationTags(retrievePossibleCombination(modelName, modelTags));
    }, [modelName, JSON.stringify(modelTags)]);

    useEffect(() => {
        if (!originalModelsList.length) {
            setModelsList([]);
            return;
        }

        applyFiltersToModels(originalModelsList, baseModelList, isSorted);
    }, [baseModelList, isSorted, originalModelsList]);

    const handleAddTagIntoSelectedTagsListBySelecting = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
            setInputValue(prevValue => {
                const tags = prevValue
                    .split(/[\s,]+/)
                    .map(t => t.trim())
                    .filter(t => t !== tag && t !== "");
                return tags.join(", ");
            });
        } else {
            setSelectedTags([...selectedTags, tag]);
            setInputValue(prevValue => (prevValue ? `${prevValue}, ${tag}` : tag));
        }
    };

    const handleUpdateModelsList = async () => {
        setIsLoading(true);
        dispatch(clearError());

        if (!inputValue.trim()) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetchDatabaseRelatedModelsByTagsList(
                inputValue.split(/,\s*|\s+/).filter(Boolean),
                dispatch
            );

            const data = response || [];
            setOriginalModelsList(data);
            setModelsList(data);
            setHiddenToastIds([]);

            const uniqueBaseModels = Array.from(
                new Set(data.map((obj: RelatedModel) => obj.baseModel))
            ).map(baseModel => ({
                baseModel: baseModel as string,
                display: true
            }));

            setBaseModelList(uniqueBaseModels);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = (id: number) => {
        setHiddenToastIds(prev => [...prev, id]);
    };

    const handleReverseModelList = () => {
        setIsSorted(prev => !prev);
    };

    const handleClearTags = () => {
        setSelectedTags([]);
        setInputValue("");
    };

    const handleToggleColapPanel = () => {
        setUsColapPanelOpen(!isColapPanelOpen);
    };

    const handleToggleBaseModelCheckbox = (index: number) => {
        setBaseModelList(prevState => {
            const newState = [...prevState];
            newState[index] = {
                ...newState[index],
                display: !newState[index].display,
            };
            return newState;
        });
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
                onClick={toggleDatabaseRelatedModelsPanelOpen}
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
                    <h6>Database's Related Models Panel</h6>
                </div>

                <InputGroup className="mb-3">
                    <Button
                        disabled={isLoading}
                        onClick={handleClearTags}
                        style={{
                            backgroundColor: "#b02a37",
                            color: "#fff",
                            border: "1px solid #8f1f2b",
                            boxShadow: "none",
                        }}
                    >
                        {isLoading ? <BsArrowRepeat className="spinner" /> : "Clear"}
                    </Button>

                    <FormControl
                        placeholder="file name"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        style={{
                            backgroundColor: theme.rowBackgroundColor,
                            color: theme.rowFontColor,
                            border: `1px solid ${theme.evenRowBackgroundColor}`,
                        }}
                    />

                    <Button
                        disabled={isLoading}
                        onClick={handleUpdateModelsList}
                        style={{
                            backgroundColor: theme.headerBackgroundColor,
                            color: theme.headerFontColor,
                            border: `1px solid ${theme.evenRowBackgroundColor}`,
                            boxShadow: "none",
                        }}
                    >
                        {isLoading ? <BsArrowRepeat className="spinner" /> : "Submit"}
                    </Button>
                </InputGroup>

                <div
                    style={{
                        padding: "5px 0",
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        gap: "8px",
                        marginBottom: "12px",
                    }}
                >
                    <Button
                        disabled={isLoading}
                        onClick={handleReverseModelList}
                        style={baseButtonStyle}
                    >
                        {isLoading ? <BsArrowRepeat className="spinner" /> : (isSorted ? <BsSortUp /> : <BsSortDown />)}
                    </Button>

                    <div
                        style={{
                            flexShrink: 0,
                            margin: 0,
                            padding: 0,
                            display: "inline-block",
                            verticalAlign: "top",
                            position: "relative",
                            background: "transparent",
                            overflow: "visible",
                        }}
                    >
                        <div
                            onClick={handleToggleColapPanel}
                            aria-controls="collapse-panel-related"
                            aria-expanded={isColapPanelOpen}
                            style={{
                                ...baseButtonStyle,
                                cursor: "pointer",
                                padding: "10px 12px",
                                textAlign: "center",
                            }}
                        >
                            <BsType />
                        </div>

                        {isColapPanelOpen && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "calc(100% + 10px)",
                                    left: 0,
                                    zIndex: 1000,
                                    background: "transparent",
                                }}
                            >
                                <div
                                    id="collapse-panel-related"
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        background: theme.headerBackgroundColor,
                                        color: theme.headerFontColor,
                                        border: `1px solid ${theme.evenRowBackgroundColor}`,
                                        boxShadow: isDarkMode
                                            ? "0 6px 18px rgba(0,0,0,0.35)"
                                            : "0 6px 18px rgba(0,0,0,0.10)",
                                        width: "max-content",
                                        minWidth: "180px",
                                    }}
                                >
                                    {baseModelList.map((item, index) => (
                                        <label
                                            key={item.baseModel}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                marginBottom: "6px",
                                                color: theme.headerFontColor,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={item.display}
                                                onChange={() => handleToggleBaseModelCheckbox(index)}
                                            />
                                            <span>{item.baseModel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "12px",
                    }}
                >
                    {possibleCombinationTags.map((tag, index) => {
                        const isSelected = inputTokens.includes(tag);

                        return (
                            <button
                                key={`${tag}-${index}`}
                                onClick={() => handleAddTagIntoSelectedTagsListBySelecting(tag)}
                                style={{
                                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                                    borderRadius: "999px",
                                    padding: "6px 10px",
                                    backgroundColor: isSelected
                                        ? theme.rowBackgroundColor
                                        : theme.headerBackgroundColor,
                                    color: isSelected
                                        ? theme.rowFontColor
                                        : theme.headerFontColor,
                                    cursor: "pointer",
                                    boxShadow: isDarkMode
                                        ? "0 2px 8px rgba(0,0,0,0.20)"
                                        : "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>

                {isLoading ? (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "18px 0",
                        }}
                    >
                        <Spinner animation="border" style={{ color: theme.headerFontColor }} />
                    </div>
                ) : (
                    <>
                        {modelsList?.map((model) => {
                            if (hiddenToastIds.includes(model.id)) return null;

                            return (
                                <div key={model.id} style={{ marginBottom: "12px" }}>
                                    <Toast
                                        onClose={() => handleClose(model.id)}
                                        style={{
                                            width: "100%",
                                            backgroundColor: theme.panelBackground,
                                            color: theme.panelText,
                                            border: `1px solid ${theme.panelBorder}`,
                                            borderRadius: "10px",
                                            boxShadow: isDarkMode
                                                ? "0 6px 18px rgba(0,0,0,0.35)"
                                                : "0 6px 18px rgba(0,0,0,0.10)",
                                        }}
                                    >
                                        <Toast.Header
                                            style={{
                                                backgroundColor: theme.headerBackgroundColor,
                                                color: theme.headerFontColor,
                                                borderBottom: `1px solid ${theme.panelBorder}`,
                                            }}
                                            closeButton
                                        >
                                            <Col
                                                xs={10}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    flexWrap: "wrap",
                                                    color: theme.headerFontColor,
                                                }}
                                            >
                                                <Badge
                                                    style={{
                                                        backgroundColor: theme.rowBackgroundColor,
                                                        color: theme.rowFontColor,
                                                        border: `1px solid ${theme.evenRowBackgroundColor}`,
                                                    }}
                                                >
                                                    {model?.baseModel}
                                                </Badge>
                                                <b>
                                                    <span>#{model?.modelNumber}_{model?.versionNumber}</span> : <span>{model?.name}</span>
                                                </b>
                                            </Col>
                                        </Toast.Header>

                                        <Toast.Body
                                            style={{
                                                backgroundColor: theme.panelBackground,
                                                color: theme.panelText,
                                            }}
                                        >
                                            <div style={{ marginBottom: "10px" }}>
                                                {model?.imageUrls?.[0]?.url && (
                                                    <Carousel fade interval={null}>
                                                        {model?.imageUrls?.map((image, index) => (
                                                            <Carousel.Item key={index}>
                                                                <div
                                                                    style={{
                                                                        width: "100%",
                                                                        maxHeight: "320px",
                                                                        borderRadius: "8px",
                                                                        backgroundColor: theme.headerBackgroundColor,
                                                                        overflow: "hidden",
                                                                    }}
                                                                >
                                                                    <SmartImage
                                                                        src={image.url || "https://placehold.co/200x250"}
                                                                        alt={model.name}
                                                                        isDarkMode={isDarkMode}
                                                                        maxHeight="320px"
                                                                        borderRadius={8}
                                                                        loading="lazy"
                                                                        showRetryButton={false}
                                                                    />
                                                                </div>
                                                            </Carousel.Item>
                                                        ))}
                                                    </Carousel>
                                                )}
                                            </div>

                                            <a
                                                href={model?.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: theme.subText,
                                                    textDecoration: "underline",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {model?.url}
                                            </a>
                                        </Toast.Body>
                                    </Toast>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default DatabaseRelatedModelsPanel;