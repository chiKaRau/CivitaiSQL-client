import React, { useEffect, useState, useRef } from "react";
import { Toast, Collapse, Carousel, Spinner, Button, Badge } from "react-bootstrap";
import Col from "react-bootstrap/Col";
import { BiUndo } from "react-icons/bi";
import { SlDocs } from "react-icons/sl";
import { TbCloudX } from "react-icons/tb";
import { BsArrowRepeat, BsSortDown, BsSortUp, BsType } from "react-icons/bs";

// Store
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../store/configureStore";
import { setIsBookmarked } from "../../store/actions/chromeActions";
import { setError, clearError } from "../../store/actions/errorsActions";

// api
import {
    fetchAddRecordToDatabase,
    fetchRemoveRecordFromDatabaseByID,
    fetchDatabaseModelInfoByModelID
} from "../../api/civitaiSQL_api";

// utils
import { removeBookmarkByUrl, bookmarkThisModel } from "../../utils/chromeUtils";

// theme
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import SmartImage from "../window_offline/SmartImage";

// Interface
interface DatabaseModelInfoPanelProps {
    toggleDatabaseModelInfoPanelOpen: () => void;
    isDarkMode?: boolean;
}

const DatabaseModelInfoPanel: React.FC<DatabaseModelInfoPanelProps> = ({
    toggleDatabaseModelInfoPanelOpen,
    isDarkMode = true
}) => {
    const isInitialMount = useRef(true);
    const dispatch = useDispatch();
    const theme = isDarkMode ? darkTheme : lightTheme;

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl } = civitaiModel;

    const databaseModel = useSelector((state: AppState) => state.databaseModel);
    const databaseData: Record<string, any> | undefined = databaseModel.databaseModelObject;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, downloadFilePath } = chrome;

    const [originalModelsList, setOriginalModelsList] = useState<
        { name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[]
    >([]);
    const [modelsList, setModelsList] = useState<
        {
            name: string; url: string; id: number;
            modelNumber?: string; versionNumber?: string;
            baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[]
        }[]
    >([]);
    const [visibleToasts, setVisibleToasts] = useState<boolean[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isSorted, setIsSorted] = useState(false);
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string; display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);

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

    const panelCardStyle: React.CSSProperties = {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "10px",
        boxShadow: isDarkMode
            ? "0 6px 18px rgba(0,0,0,0.35)"
            : "0 6px 18px rgba(0,0,0,0.10)",
    };

    const applyFiltersToModels = (
        sourceList: { name: string; url: string; id: number; baseModel: string; imageUrls: { url: string; height: number; width: number; nsfw: string }[] }[],
        nextBaseModelList: { baseModel: string; display: boolean }[],
        nextIsSorted: boolean
    ) => {
        const filtered = [...sourceList].filter(model =>
            nextBaseModelList.some(baseModelObj => baseModelObj.baseModel === model.baseModel && baseModelObj.display)
        );

        setModelsList(nextIsSorted ? [...filtered].reverse() : filtered);
    };

    useEffect(() => {
        handleUpdateModelsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        applyFiltersToModels(originalModelsList, baseModelList, isSorted);
    }, [baseModelList, isSorted, originalModelsList]);

    const handleUpdateModelsList = async () => {
        setIsLoading(true);
        dispatch(clearError());

        const modelID = civitaiModel.civitaiModelID;

        if (modelID === null || modelID === "") {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        const data = (await fetchDatabaseModelInfoByModelID(modelID, dispatch)) || [];
        setOriginalModelsList(data);
        setModelsList(data);

        const uniqueBaseModels = Array.from(
            new Set(data.map((obj: any) => obj.baseModel))
        ).map(baseModel => ({
            baseModel: baseModel as string,
            display: true
        }));

        setBaseModelList(uniqueBaseModels);
        setVisibleToasts(data.map(() => true));
        setIsLoading(false);
    };

    const handleReverseModelList = () => {
        setIsSorted(prev => !prev);
    };

    const handleToggleColapPanel = () => {
        setUsColapPanelOpen(!isColapPanelOpen);
    };

    const handleToggleBaseModelCheckbox = (index: number) => {
        setBaseModelList(prevState => {
            const newState = [...prevState];
            newState[index] = {
                ...newState[index],
                display: !newState[index].display
            };
            return newState;
        });
    };

    const handleClose = (index: number) => {
        const newVisibleToasts = [...visibleToasts];
        newVisibleToasts[index] = false;
        setVisibleToasts(newVisibleToasts);
    };

    const handleAddModeltoDatabase = () => {
        setIsLoading(true);
        dispatch(clearError());

        if (
            civitaiUrl === "" || selectedCategory === "" ||
            civitaiUrl === undefined || selectedCategory === undefined ||
            civitaiUrl === null || selectedCategory === null
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        fetchAddRecordToDatabase(selectedCategory, civitaiUrl, downloadFilePath, dispatch);
        bookmarkThisModel(civitaiData?.type, dispatch);
        toggleDatabaseModelInfoPanelOpen();
        setIsLoading(false);
    };

    const handleRemoveModelFromDatabase = (id: number) => {
        setIsLoading(true);
        dispatch(clearError());

        if (id === null || id === undefined) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        fetchRemoveRecordFromDatabaseByID(id, dispatch);
        toggleDatabaseModelInfoPanelOpen();
        setIsLoading(false);
    };

    const handleRemoveModelBookmarkByUrl = (url: string) => {
        removeBookmarkByUrl(url, dispatch, false, false);
        if (url === civitaiUrl) {
            dispatch(setIsBookmarked(true));
        }
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
                onClick={toggleDatabaseModelInfoPanelOpen}
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
                <div className="panel-header-text" style={{ color: theme.panelText }}>
                    <h6>Database's ModelInfo Panel</h6>
                </div>

                <div
                    className="buttonGroup"
                    style={{
                        padding: "5px",
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        gap: "8px",
                        flexWrap: "wrap",
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
                            aria-controls="collapse-panel-info"
                            aria-expanded={isColapPanelOpen}
                            style={{
                                ...baseButtonStyle,
                                cursor: "pointer",
                                padding: "10px 12px",
                                textAlign: "center",
                                backgroundColor: theme.headerBackgroundColor,
                                color: theme.headerFontColor,
                                outline: "none",
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
                                    id="collapse-panel-info"
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

                <Button
                    onClick={handleAddModeltoDatabase}
                    disabled={isLoading}
                    variant="success"
                    size="lg"
                    className="w-100"
                    style={{
                        marginBottom: "12px",
                    }}
                >
                    <SlDocs style={{ marginRight: "6px" }} />
                    Add to Database
                    {isLoading && <span className="button-state-complete">✓</span>}
                </Button>

                {isLoading ? (
                    <div className="centered-container" style={{ color: theme.panelText }}>
                        <Spinner
                            animation="border"
                            style={{ color: theme.headerFontColor }}
                        />
                    </div>
                ) : (
                    <>
                        {modelsList?.map((model, index) => {
                            if (!visibleToasts[index]) return null;

                            return (
                                <div
                                    key={`${model.id}-${index}`}
                                    className="panel-toast-container"
                                    style={{ marginBottom: "12px" }}
                                >
                                    <Toast
                                        onClose={() => handleClose(index)}
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
                                                className="panel-toast-header"
                                                style={{
                                                    color: theme.headerFontColor,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    flexWrap: "wrap",
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
                                            <div className="panel-image-carousel-container">
                                                {model?.imageUrls?.[0]?.url && (
                                                    <Carousel fade interval={null}>
                                                        {model?.imageUrls?.map((image, imageIndex) => (
                                                            <Carousel.Item key={`${model.id}-${imageIndex}`}>
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

                                            <div style={{ marginTop: "10px", marginBottom: "12px", wordBreak: "break-all" }}>
                                                <a
                                                    href={model?.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: theme.subText,
                                                        textDecoration: "underline",
                                                    }}
                                                >
                                                    {model?.url}
                                                </a>
                                            </div>

                                            <Button
                                                disabled={isLoading}
                                                onClick={() => {
                                                    handleRemoveModelBookmarkByUrl(model?.url);
                                                    handleRemoveModelFromDatabase(model?.id);
                                                }}
                                                className="btn btn-lg w-100"
                                                style={{
                                                    backgroundColor: "#b02a37",
                                                    color: "#fff",
                                                    border: "1px solid #8f1f2b",
                                                    borderRadius: "8px",
                                                    minHeight: "44px",
                                                    boxShadow: isDarkMode
                                                        ? "0 4px 12px rgba(0,0,0,0.25)"
                                                        : "0 4px 12px rgba(0,0,0,0.08)",
                                                }}
                                            >
                                                <TbCloudX style={{ marginRight: "6px" }} />
                                                Remove
                                                {isLoading && <span className="button-state-complete">✓</span>}
                                            </Button>
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

export default DatabaseModelInfoPanel;