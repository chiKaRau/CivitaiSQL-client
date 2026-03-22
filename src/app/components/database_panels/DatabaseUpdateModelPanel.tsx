import React, { useEffect, useState } from "react";
import { Toast, Carousel, Spinner, Button, Badge } from "react-bootstrap";
import Col from "react-bootstrap/Col";
import { BiUndo } from "react-icons/bi";
import {
    BsFillFileEarmarkArrowUpFill,
    BsFillCartCheckFill,
    BsType,
    BsArrowRepeat,
    BsSortDown,
    BsSortUp
} from "react-icons/bs";

// Store
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "../../store/configureStore";
import { updateDownloadFilePath } from "../../store/actions/chromeActions";
import { setError, clearError } from "../../store/actions/errorsActions";

// api
import {
    fetchUpdateRecordAtDatabase,
    fetchDatabaseModelInfoByModelID,
    fetchDownloadFilesByServer_v2,
    fetchDownloadFilesByBrowser_v2,
    fetchCheckCartList,
    fetchCivitaiModelInfoFromCivitaiByVersionID,
    fetchAddOfflineDownloadFileIntoOfflineDownloadList,
    fetchCivitaiModelInfoFromCivitaiByModelID
} from "../../api/civitaiSQL_api";

// utils
import { bookmarkThisModel, callChromeBrowserDownload_v2 } from "../../utils/chromeUtils";
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils";

// theme
import { darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";

interface DatabaseUpdateModelPanelProps {
    toggleDatabaseUpdateModelPanelOpen: () => void;
    isDarkMode?: boolean;
}

type ModelEntry = {
    name: string;
    url: string;
    id: number;
    baseModel: string;
    localPath?: string | null;
    imageUrls: { url: string; height: number; width: number; nsfw: string }[];
};

const DatabaseUpdateModelPanel: React.FC<DatabaseUpdateModelPanelProps> = ({
    toggleDatabaseUpdateModelPanelOpen,
    isDarkMode = true
}) => {
    const dispatch = useDispatch();
    const theme = isDarkMode ? darkTheme : lightTheme;

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: Record<string, any> | undefined = civitaiModel.civitaiModelObject;
    const { civitaiUrl, civitaiVersionID, civitaiModelID } = civitaiModel;

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, downloadMethod, downloadFilePath, offlineMode } = chrome;

    const [originalModelsList, setOriginalModelsList] = useState<ModelEntry[]>([]);
    const [modelsList, setModelsList] = useState<ModelEntry[]>([]);
    const [hiddenToastIds, setHiddenToastIds] = useState<number[]>([]);
    const [cartedById, setCartedById] = useState<Record<number, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [updateOption, setUpdateOption] = useState("Database_and_UpdateFolder");
    const [hasUpdateCompleted, setHasUpdateCompleted] = useState(false);
    const [isSorted, setIsSorted] = useState(false);
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string; display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);
    const [effectiveDownloadFilePath, setEffectiveDownloadFilePath] = useState("");

    let UpdateDownloadFilePath = "";
    const regex = /^\/@scan@\/[^\/]+\/?$/;

    if (regex.test(downloadFilePath)) {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/", "")}`;
    } else {
        UpdateDownloadFilePath = `/@scan@/Update/${downloadFilePath.replace("/@scan@/ACG/", "")}`;
    }

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
        sourceList: ModelEntry[],
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
        handleUpdateModelsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!originalModelsList.length) {
            setModelsList([]);
            return;
        }

        applyFiltersToModels(originalModelsList, baseModelList, isSorted);
    }, [originalModelsList, baseModelList, isSorted]);

    useEffect(() => {
        if (hasUpdateCompleted) {
            if (offlineMode) {
                handleAddOfflineDownloadFileintoOfflineDownloadList(effectiveDownloadFilePath);
            } else {
                handleDownload_v2(effectiveDownloadFilePath);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasUpdateCompleted, effectiveDownloadFilePath]);

    const handleUpdateModelsList = async () => {
        setIsLoading(true);
        dispatch(clearError());

        if (!civitaiModelID) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        try {
            const data = (await fetchDatabaseModelInfoByModelID(civitaiModelID, dispatch)) || [];

            setOriginalModelsList(data);
            setModelsList(data);
            setHiddenToastIds([]);

            const uniqueBaseModels = Array.from(
                new Set(data.map((obj: ModelEntry) => obj.baseModel))
            ).map(baseModel => ({
                baseModel: baseModel as string,
                display: true
            }));

            setBaseModelList(uniqueBaseModels);

            const cartStatuses = await Promise.all(
                data.map(async (element: ModelEntry) => {
                    const isCarted = await handleCheckCartListSilently(element.url);
                    return [element.id, isCarted] as const;
                })
            );

            setCartedById(Object.fromEntries(cartStatuses));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckCartListSilently = async (url: string) => {
        if (!url) return false;
        try {
            const isCarted = await fetchCheckCartList(url, dispatch);
            return !!isCarted;
        } catch (error) {
            console.error("Error checking cart list:", error);
            return false;
        }
    };

    const handleClose = (id: number) => {
        setHiddenToastIds(prev => [...prev, id]);
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

    const handleReverseModelList = () => {
        setIsSorted(prev => !prev);
    };

    const normalizeLocalPathToScanPath = (localPath?: string | null) => {
        if (!localPath) return "";

        const normalized = localPath.replace(/\\/g, "/");
        const marker = "/@scan@/";
        const markerIndex = normalized.indexOf(marker);

        if (markerIndex === -1) return "";

        let scanPath = normalized.substring(markerIndex);
        if (!scanPath.endsWith("/")) {
            scanPath += "/";
        }

        return scanPath;
    };

    const buildUpdatePathFromScanPath = (scanPath: string) => {
        if (!scanPath) return "";

        const updateRegex = /^\/@scan@\/[^\/]+\/?$/;

        if (updateRegex.test(scanPath)) {
            return `/@scan@/Update/${scanPath.replace("/@scan@/", "")}`;
        } else {
            return `/@scan@/Update/${scanPath.replace("/@scan@/ACG/", "")}`;
        }
    };

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async (targetDownloadFilePath?: string) => {
        setIsLoading(true);

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;
        const modelId = civitaiUrl.match(/\/models\/(\d+)/)?.[1] || "";

        try {
            const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);

            if (data) {
                let versionIndex = 0;
                const uri = new URL(civitaiUrl);

                if (uri.searchParams.has("modelVersionId")) {
                    const modelVersionId = uri.searchParams.get("modelVersionId");
                    versionIndex = data.modelVersions.findIndex((version: any) => {
                        return version.id == modelVersionId;
                    });
                }

                const resolvedVersionID = data?.modelVersions[versionIndex]?.id?.toString();
                const resolvedModelID = modelId;
                const civitaiFileName = retrieveCivitaiFileName(data, resolvedVersionID);
                const civitaiModelFileList = retrieveCivitaiFilesList(data, resolvedVersionID);
                const civitaiTags = data?.tags;

                if (
                    !civitaiUrl ||
                    !civitaiFileName ||
                    !resolvedModelID ||
                    !resolvedVersionID ||
                    !finalDownloadFilePath ||
                    !selectedCategory ||
                    !civitaiModelFileList?.length ||
                    civitaiTags == null
                ) {
                    console.log("fail in handleAddOfflineDownloadFileintoOfflineDownloadList()");
                    return;
                }

                const modelObject = {
                    downloadFilePath: finalDownloadFilePath,
                    civitaiFileName,
                    civitaiModelID: resolvedModelID,
                    civitaiVersionID: resolvedVersionID,
                    civitaiModelFileList,
                    civitaiUrl,
                    selectedCategory,
                    civitaiTags
                };

                await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);
                setHasUpdateCompleted(false);
                toggleDatabaseUpdateModelPanelOpen();
            }
        } catch (error) {
            console.error(error);
        }

        setIsLoading(false);
    };

    const handleDownload_v2 = async (targetDownloadFilePath?: string) => {
        setIsLoading(true);
        dispatch(clearError());

        const finalDownloadFilePath = targetDownloadFilePath || downloadFilePath;

        const civitaiFileName = retrieveCivitaiFileName(civitaiData, civitaiVersionID);
        const civitaiModelFileList = retrieveCivitaiFilesList(civitaiData, civitaiVersionID);

        if (
            !civitaiUrl ||
            !civitaiFileName ||
            !civitaiModelID ||
            !civitaiVersionID ||
            !finalDownloadFilePath ||
            !civitaiModelFileList?.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        const modelObject = {
            downloadFilePath: finalDownloadFilePath,
            civitaiFileName,
            civitaiModelID,
            civitaiVersionID,
            civitaiModelFileList,
            civitaiUrl
        };

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            await fetchDownloadFilesByBrowser_v2(civitaiUrl, finalDownloadFilePath, dispatch);

            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(civitaiVersionID, dispatch);
                if (data) {
                    callChromeBrowserDownload_v2({ ...modelObject, modelVersionObject: data });
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Error fetching data for civitaiVersionID:", civitaiVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            }
        }

        bookmarkThisModel(civitaiData?.type, dispatch);
        setHasUpdateCompleted(false);
        toggleDatabaseUpdateModelPanelOpen();
        setIsLoading(false);
    };

    const handleUpdateModel = async (id: number) => {
        setIsLoading(true);
        dispatch(clearError());

        if (!civitaiUrl || !selectedCategory || id == null) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        let selectedPath = "";

        switch (updateOption) {
            case "Database_and_LocalUpdateFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                selectedPath = localUpdatePath || UpdateDownloadFilePath;
                break;
            }
            case "Database_and_LocalFileFolder": {
                const clickedModel = modelsList.find(m => m.id === id);
                const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                selectedPath = localScanPath || downloadFilePath;
                break;
            }
            case "Database_and_UpdateFolder":
                selectedPath = UpdateDownloadFilePath;
                break;
            case "Database_and_FileFolder":
                selectedPath = downloadFilePath;
                break;
            case "Database_Only":
                selectedPath = downloadFilePath;
                break;
            default:
                selectedPath = "/@scan@/ACG/Temp/";
                break;
        }

        dispatch(updateDownloadFilePath(selectedPath));
        setEffectiveDownloadFilePath(selectedPath);

        await fetchUpdateRecordAtDatabase(id, civitaiUrl, selectedCategory, dispatch);

        if (updateOption !== "Database_Only") {
            setHasUpdateCompleted(true);
        } else {
            bookmarkThisModel(civitaiData?.type, dispatch);
            setHasUpdateCompleted(false);
            toggleDatabaseUpdateModelPanelOpen();
        }

        setIsLoading(false);
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
                onClick={toggleDatabaseUpdateModelPanelOpen}
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
                    <h6>Database's Update Model Panel</h6>
                </div>

                <div
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
                            aria-controls="collapse-panel-update"
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
                                    id="collapse-panel-update"
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

                {isLoading ? (
                    <div
                        className="centered-container"
                        style={{ color: theme.panelText }}
                    >
                        <Spinner animation="border" style={{ color: theme.headerFontColor }} />
                    </div>
                ) : (
                    <>
                        {modelsList.map((model) => {
                            const localScanPath = normalizeLocalPathToScanPath(model?.localPath);
                            const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);

                            if (hiddenToastIds.includes(model.id)) return null;

                            return (
                                <div
                                    key={model.id}
                                    className="panel-toast-container"
                                    style={{ marginBottom: "12px" }}
                                >
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
                                                    <span> #{model?.id}</span> : <span>{model?.name}</span>
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
                                                        {model.imageUrls.map((image, imageIndex) => (
                                                            <Carousel.Item key={`${model.id}-${imageIndex}`}>
                                                                <img
                                                                    src={image.url || "https://placehold.co/200x250"}
                                                                    alt={model.name}
                                                                    style={{
                                                                        width: "100%",
                                                                        maxHeight: "320px",
                                                                        objectFit: "contain",
                                                                        borderRadius: "8px",
                                                                        backgroundColor: theme.headerBackgroundColor,
                                                                    }}
                                                                />
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

                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "8px",
                                                    marginBottom: "12px",
                                                }}
                                            >
                                                {localUpdatePath && (
                                                    <label
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "flex-start",
                                                            gap: "8px",
                                                            color: theme.panelText,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            value="Database_and_LocalUpdateFolder"
                                                            checked={updateOption === "Database_and_LocalUpdateFolder"}
                                                            onChange={() => setUpdateOption("Database_and_LocalUpdateFolder")}
                                                        />
                                                        <span style={{ wordBreak: "break-word" }}>
                                                            Database & Update to {localUpdatePath}
                                                        </span>
                                                    </label>
                                                )}

                                                {localScanPath && (
                                                    <label
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "flex-start",
                                                            gap: "8px",
                                                            color: theme.panelText,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            value="Database_and_LocalFileFolder"
                                                            checked={updateOption === "Database_and_LocalFileFolder"}
                                                            onChange={() => setUpdateOption("Database_and_LocalFileFolder")}
                                                        />
                                                        <span style={{ wordBreak: "break-word" }}>
                                                            Database & {localScanPath}
                                                        </span>
                                                    </label>
                                                )}

                                                <label
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: "8px",
                                                        color: theme.panelText,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        value="Database_and_UpdateFolder"
                                                        checked={updateOption === "Database_and_UpdateFolder"}
                                                        onChange={() => setUpdateOption("Database_and_UpdateFolder")}
                                                    />
                                                    <span style={{ wordBreak: "break-word" }}>
                                                        Database & Update to {UpdateDownloadFilePath}
                                                    </span>
                                                </label>

                                                <label
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: "8px",
                                                        color: theme.panelText,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        value="Database_and_FileFolder"
                                                        checked={updateOption === "Database_and_FileFolder"}
                                                        onChange={() => setUpdateOption("Database_and_FileFolder")}
                                                    />
                                                    <span style={{ wordBreak: "break-word" }}>
                                                        Database & {downloadFilePath}
                                                    </span>
                                                </label>

                                                <label
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: "8px",
                                                        color: theme.panelText,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        value="Database_Only"
                                                        checked={updateOption === "Database_Only"}
                                                        onChange={() => setUpdateOption("Database_Only")}
                                                    />
                                                    <span>Database Only</span>
                                                </label>
                                            </div>

                                            <div
                                                className="panel-update-button-container"
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <Button
                                                    variant={offlineMode ? "success" : "primary"}
                                                    disabled={isLoading}
                                                    onClick={() => handleUpdateModel(model?.id)}
                                                    className="btn btn-lg w-100"
                                                >
                                                    <BsFillFileEarmarkArrowUpFill style={{ marginRight: "6px" }} />
                                                    Update
                                                    {isLoading && <span className="button-state-complete">✓</span>}
                                                </Button>

                                                {cartedById[model.id] ? (
                                                    <BsFillCartCheckFill
                                                        style={{
                                                            fontSize: "1.3rem",
                                                            color: theme.headerFontColor,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                ) : null}
                                            </div>
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

export default DatabaseUpdateModelPanel;