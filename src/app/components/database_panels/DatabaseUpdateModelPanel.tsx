import React, { useEffect, useState } from "react";
import {
    Toast,
    Carousel,
    Spinner,
    Badge,
    Collapse,
    OverlayTrigger,
    Tooltip,
} from "react-bootstrap";
import { BiUndo } from "react-icons/bi";
import {
    BsFillFileEarmarkArrowUpFill,
    BsFillCartCheckFill,
    BsArrowRepeat,
    BsSortDown,
    BsSortUp,
} from "react-icons/bs";
import { FaFilter, FaChevronUp, FaChevronDown } from "react-icons/fa";

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
    fetchCivitaiModelInfoFromCivitaiByModelID,
    fetchRemoveRecordFromDatabaseByID,
    fetchMoveModelVersionFilesToDelete,
    fetchAddRecordToDatabase,
} from "../../api/civitaiSQL_api";

// utils
import { bookmarkThisModel, callChromeBrowserDownload_v2 } from "../../utils/chromeUtils";
import { retrieveCivitaiFileName, retrieveCivitaiFilesList } from "../../utils/objectUtils";

// theme
import { AppTheme, darkTheme, lightTheme } from "../window_offline/OfflineWindow.theme";
import SmartImage from "../window_offline/SmartImage";
import ModelVersionFileExistsBadge from "../ModelVersionFileExistsBadge";
import LocalFileFolderOption from "./LocalFileFolderOption";

type VersionLike = {
    id: number | string;
    name?: string;
    baseModel?: string;
};

type ModelDataLike = Record<string, any> | undefined;

type ModelEntry = {
    name: string;
    url: string;
    id: number;
    baseModel: string;
    modelNumber?: string | number | null;
    versionNumber?: string | number | null;
    localPath?: string | null;
    imageUrls: { url: string; height: number; width: number; nsfw: string }[];
};

interface DatabaseUpdateModelPanelProps {
    // legacy usage
    toggleDatabaseUpdateModelPanelOpen?: () => void;
    isDarkMode?: boolean;

    // WindowUpdateModelPanel usage
    modelID?: string;
    url?: string;
    modelData?: ModelDataLike;
    selectedVersion?: VersionLike;
    selectedCategory?: string;
    downloadFilePath?: string;
    setDownloadFilePath?: (downloadFilePath: string) => void;
    setHasUpdated?: (hasUpdated: boolean) => void;
    closePanel?: () => void;
    theme?: AppTheme;
}

const DatabaseUpdateModelPanel: React.FC<DatabaseUpdateModelPanelProps> = (props) => {
    const dispatch = useDispatch();

    const civitaiModel = useSelector((state: AppState) => state.civitaiModel);
    const civitaiData: ModelDataLike = civitaiModel.civitaiModelObject;
    const storeCivitaiUrl = civitaiModel.civitaiUrl;
    const storeCivitaiVersionID = civitaiModel.civitaiVersionID;
    const storeCivitaiModelID = civitaiModel.civitaiModelID;

    const chrome = useSelector((state: AppState) => state.chrome);
    const {
        selectedCategory: chromeSelectedCategory,
        downloadMethod,
        downloadFilePath: chromeDownloadFilePath,
        offlineMode,
    } = chrome;

    const resolvedIsDarkMode = props.isDarkMode ?? chrome.isDarkMode ?? true;
    const theme = props.theme ?? (resolvedIsDarkMode ? darkTheme : lightTheme);

    const resolvedModelID = String(props.modelID ?? storeCivitaiModelID ?? "");
    const resolvedUrl = props.url ?? storeCivitaiUrl ?? "";
    const resolvedModelData = props.modelData ?? civitaiData;
    const resolvedVersionID = String(props.selectedVersion?.id ?? storeCivitaiVersionID ?? "");
    const resolvedSelectedCategory = props.selectedCategory ?? chromeSelectedCategory ?? "";
    const resolvedDownloadFilePath = props.downloadFilePath ?? chromeDownloadFilePath ?? "";

    const isEmbeddedMode =
        !!props.modelID ||
        !!props.selectedVersion ||
        !!props.closePanel ||
        !!props.setHasUpdated ||
        !!props.theme;

    const [originalModelsList, setOriginalModelsList] = useState<ModelEntry[]>([]);
    const [modelsList, setModelsList] = useState<ModelEntry[]>([]);
    const [hiddenToastIds, setHiddenToastIds] = useState<number[]>([]);
    const [cartedById, setCartedById] = useState<Record<number, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [updateOptionById, setUpdateOptionById] = useState<Record<number, string>>({});
    const [localFileFolderAvailableById, setLocalFileFolderAvailableById] = useState<Record<number, boolean>>({});
    const [isSorted, setIsSorted] = useState(false);
    const [baseModelList, setBaseModelList] = useState<{ baseModel: string; display: boolean }[]>([]);
    const [isColapPanelOpen, setUsColapPanelOpen] = useState(false);

    const regex = /^\/@scan@\/[^\/]+\/?$/;
    const UpdateDownloadFilePath = regex.test(resolvedDownloadFilePath)
        ? `/@scan@/Update/${resolvedDownloadFilePath.replace("/@scan@/", "")}`
        : `/@scan@/Update/${resolvedDownloadFilePath.replace("/@scan@/ACG/", "")}`;

    const selectedBaseModel =
        props.selectedVersion?.baseModel ||
        resolvedModelData?.modelVersions?.find?.(
            (version: any) => String(version?.id ?? "") === resolvedVersionID
        )?.baseModel ||
        "";

    const handleClosePanel = () => {
        if (props.closePanel) {
            props.closePanel();
            return;
        }

        if (props.toggleDatabaseUpdateModelPanelOpen) {
            props.toggleDatabaseUpdateModelPanelOpen();
        }
    };

    const markUpdatedAndClose = () => {
        props.setHasUpdated?.(true);
        handleClosePanel();
    };

    const syncDownloadFilePath = (nextPath: string) => {
        props.setDownloadFilePath?.(nextPath);
        dispatch(updateDownloadFilePath(nextPath));
    };

    const panelCardStyle: React.CSSProperties = {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "10px",
        boxShadow: resolvedIsDarkMode
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
        boxShadow: resolvedIsDarkMode
            ? "0 4px 12px rgba(0,0,0,0.25)"
            : "0 4px 12px rgba(0,0,0,0.08)",
    };

    const radioCardStyle = (isSelected: boolean): React.CSSProperties => ({
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: isSelected
            ? `1px solid ${theme.buttonBorder}`
            : `1px solid ${theme.panelBorder}`,
        background: isSelected
            ? theme.rowBackgroundColor
            : theme.panelBackground,
        cursor: "pointer",
        fontSize: "14px",
        color: theme.panelText,
        wordBreak: "break-word",
    });

    const applyFiltersToModels = (
        sourceList: ModelEntry[],
        nextBaseModelList: { baseModel: string; display: boolean }[],
        nextIsSorted: boolean
    ) => {
        const filtered = [...sourceList].filter((model) =>
            nextBaseModelList.some(
                (baseModelObj) => baseModelObj.baseModel === model.baseModel && baseModelObj.display
            )
        );

        setModelsList(nextIsSorted ? [...filtered].reverse() : filtered);
    };

    const isPendingPath = (path?: string | null) => {
        if (!path) return false;
        const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
        return /\/Pending$/i.test(normalized) || /\/Pending\//i.test(`${normalized}/`);
    };

    const normalizeLocalPathToScanPath = (localPath?: string | null) => {
        if (!localPath) return "";

        const normalized = localPath.replace(/\\/g, "/");

        const scanMarker = "/@scan@/";
        const scanMarkerIndex = normalized.indexOf(scanMarker);
        if (scanMarkerIndex !== -1) {
            let scanPath = normalized.substring(scanMarkerIndex);
            if (!scanPath.endsWith("/")) {
                scanPath += "/";
            }
            return scanPath;
        }

        const acgMarker = "/ACG/";
        const acgMarkerIndex = normalized.indexOf(acgMarker);
        if (acgMarkerIndex !== -1) {
            let scanPath = `/@scan@${normalized.substring(acgMarkerIndex)}`;
            if (!scanPath.endsWith("/")) {
                scanPath += "/";
            }
            return scanPath;
        }

        return "";
    };

    const buildUpdatePathFromScanPath = (scanPath: string) => {
        if (!scanPath) return "";

        const updatePathRegex = /^\/@scan@\/[^\/]+\/?$/;

        if (updatePathRegex.test(scanPath)) {
            return `/@scan@/Update/${scanPath.replace("/@scan@/", "")}`;
        }

        return `/@scan@/Update/${scanPath.replace("/@scan@/ACG/", "")}`;
    };

    const setLocalFileFolderAvailableForModel = (modelId: number, isAvailable: boolean) => {
        setLocalFileFolderAvailableById((prev) => {
            if (prev[modelId] === isAvailable) {
                return prev;
            }

            return {
                ...prev,
                [modelId]: isAvailable,
            };
        });
    };

    const getAvailableOptionsForModel = (model: ModelEntry) => {
        const localScanPath = normalizeLocalPathToScanPath(model?.localPath);
        const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);

        const options: string[] = [];

        // Top priority first
        if (
            localScanPath &&
            !isPendingPath(localScanPath) &&
            localFileFolderAvailableById[model.id] === true
        ) {
            options.push("Database_and_LocalFileFolder");
        }

        if (localUpdatePath && !isPendingPath(localUpdatePath)) {
            options.push("Database_and_LocalUpdateFolder");
        }

        if (!isPendingPath(UpdateDownloadFilePath)) {
            options.push("Database_and_UpdateFolder");
        }

        if (!isPendingPath(resolvedDownloadFilePath)) {
            options.push("Database_Only");
        }

        return options;
    };

    const getDefaultUpdateOptionForModel = (model: ModelEntry) => {
        const options = getAvailableOptionsForModel(model);
        return options[0] || "";
    };

    const setUpdateOptionForModel = (modelId: number, value: string) => {
        setUpdateOptionById((prev) => ({
            ...prev,
            [modelId]: value,
        }));
    };

    useEffect(() => {
        void handleUpdateModelsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedModelID]);

    useEffect(() => {
        if (!originalModelsList.length) {
            setModelsList([]);
            return;
        }

        applyFiltersToModels(originalModelsList, baseModelList, isSorted);
    }, [originalModelsList, baseModelList, isSorted]);

    useEffect(() => {
        if (!modelsList?.length) {
            setUpdateOptionById({});
            return;
        }

        setUpdateOptionById((prev) => {
            const next = { ...prev };

            modelsList.forEach((model) => {
                const allowedOptions = getAvailableOptionsForModel(model);
                const currentValue = next[model.id];

                if (!allowedOptions.length) {
                    next[model.id] = "";
                } else if (!currentValue || !allowedOptions.includes(currentValue)) {
                    next[model.id] = allowedOptions[0];
                }
            });

            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelsList, resolvedDownloadFilePath, UpdateDownloadFilePath, localFileFolderAvailableById]);

    const handleUpdateModelsList = async () => {
        setIsLoading(true);
        dispatch(clearError());

        if (!resolvedModelID) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            setIsLoading(false);
            return;
        }

        try {
            const data = (await fetchDatabaseModelInfoByModelID(resolvedModelID, dispatch)) || [];

            const sortedData = [...data].sort((a: any, b: any) => {
                const aVersion = Number(a.versionNumber ?? 0);
                const bVersion = Number(b.versionNumber ?? 0);
                return bVersion - aVersion;
            });

            setOriginalModelsList(sortedData);
            setModelsList(sortedData);
            setHiddenToastIds([]);
            setLocalFileFolderAvailableById({});
            setUpdateOptionById({});

            const uniqueBaseModels = Array.from(
                new Set(sortedData.map((obj: ModelEntry) => obj.baseModel))
            ).map((baseModel) => ({
                baseModel: baseModel as string,
                display: true,
            }));

            setBaseModelList(uniqueBaseModels);

            const cartStatuses = await Promise.all(
                sortedData.map(async (element: ModelEntry) => {
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
        setHiddenToastIds((prev) => [...prev, id]);
    };

    const handleToggleColapPanel = () => {
        setUsColapPanelOpen(!isColapPanelOpen);
    };

    const handleToggleBaseModelCheckbox = (index: number) => {
        setBaseModelList((prevState) => {
            const newState = [...prevState];
            newState[index] = {
                ...newState[index],
                display: !newState[index].display,
            };
            return newState;
        });
    };

    const handleReverseModelList = () => {
        setIsSorted((prev) => !prev);
    };

    const handleAddOfflineDownloadFileintoOfflineDownloadList = async (targetDownloadFilePath?: string) => {
        const finalDownloadFilePath = targetDownloadFilePath || resolvedDownloadFilePath;
        const modelId = resolvedUrl.match(/\/models\/(\d+)/)?.[1] || resolvedModelID;

        try {
            const data = await fetchCivitaiModelInfoFromCivitaiByModelID(modelId, dispatch);

            if (!data) return;

            let versionIndex = 0;
            const uri = new URL(resolvedUrl);

            if (uri.searchParams.has("modelVersionId")) {
                const modelVersionId = uri.searchParams.get("modelVersionId");
                versionIndex = data.modelVersions.findIndex((version: any) => {
                    return String(version.id) === String(modelVersionId);
                });
            }

            const finalVersionID =
                resolvedVersionID ||
                data?.modelVersions?.[versionIndex]?.id?.toString() ||
                "";

            const civitaiFileName = retrieveCivitaiFileName(data, finalVersionID);
            const civitaiModelFileList = retrieveCivitaiFilesList(data, finalVersionID);
            const civitaiTags = data?.tags;

            if (
                !resolvedUrl ||
                !civitaiFileName ||
                !modelId ||
                !finalVersionID ||
                !finalDownloadFilePath ||
                !resolvedSelectedCategory ||
                !civitaiModelFileList?.length ||
                civitaiTags == null
            ) {
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
                return;
            }

            const modelObject = {
                downloadFilePath: finalDownloadFilePath,
                civitaiFileName,
                civitaiModelID: modelId,
                civitaiVersionID: finalVersionID,
                civitaiModelFileList,
                civitaiUrl: resolvedUrl,
                selectedCategory: resolvedSelectedCategory,
                civitaiTags,
            };

            await fetchAddOfflineDownloadFileIntoOfflineDownloadList(modelObject, false, dispatch);
            markUpdatedAndClose();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload_v2 = async (targetDownloadFilePath?: string) => {
        dispatch(clearError());

        const finalDownloadFilePath = targetDownloadFilePath || resolvedDownloadFilePath;
        const civitaiFileName = retrieveCivitaiFileName(resolvedModelData, resolvedVersionID);
        const civitaiModelFileList = retrieveCivitaiFilesList(resolvedModelData, resolvedVersionID);

        if (
            !resolvedUrl ||
            !civitaiFileName ||
            !resolvedModelID ||
            !resolvedVersionID ||
            !finalDownloadFilePath ||
            !civitaiModelFileList?.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            return;
        }

        const modelObject = {
            downloadFilePath: finalDownloadFilePath,
            civitaiFileName,
            civitaiModelID: resolvedModelID,
            civitaiVersionID: resolvedVersionID,
            civitaiModelFileList,
            civitaiUrl: resolvedUrl,
        };

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer_v2(modelObject, dispatch);
        } else {
            await fetchDownloadFilesByBrowser_v2(resolvedUrl, finalDownloadFilePath, dispatch);

            try {
                const data = await fetchCivitaiModelInfoFromCivitaiByVersionID(
                    resolvedVersionID,
                    dispatch
                );

                if (data) {
                    callChromeBrowserDownload_v2({
                        ...modelObject,
                        modelVersionObject: data,
                    });
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Error fetching data for civitaiVersionID:", resolvedVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
                return;
            }
        }

        const bookmarkValue =
            props.selectedVersion?.baseModel ||
            resolvedModelData?.type ||
            resolvedModelData?.baseModel ||
            "";

        if (bookmarkValue) {
            bookmarkThisModel(bookmarkValue, dispatch);
        }

        markUpdatedAndClose();
    };

    const resolveLocalFileFolderPath = (id: number) => {
        const clickedModel = modelsList.find((m) => m.id === id);
        const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
        return localScanPath || resolvedDownloadFilePath;
    };

    const handleDatabaseAndLocalFileFolderUpdate = async (subRowId: number) => {
        const clickedSubModel = modelsList.find((m) => m.id === subRowId);

        if (!clickedSubModel) {
            dispatch(setError({ hasError: true, errorMessage: "Clicked sub model not found" }));
            return;
        }

        const parentModelID = String(resolvedModelID);
        const parentVersionId = String(resolvedVersionID);
        const parentModelUrl = `https://civitai.red/models/${resolvedModelID}?modelVersionId=${resolvedVersionID}`;

        const subModelID = String(clickedSubModel.modelNumber || "");
        const subVersionID = String(clickedSubModel.versionNumber || "");

        const selectedPath = resolveLocalFileFolderPath(subRowId);
        const finalDownloadFilePath = selectedPath || resolvedDownloadFilePath;

        syncDownloadFilePath(finalDownloadFilePath);

        const parentModelObject = await fetchCivitaiModelInfoFromCivitaiByModelID(
            parentModelID,
            dispatch
        );

        if (!parentModelObject) {
            dispatch(setError({ hasError: true, errorMessage: "Unable to load parent model info" }));
            return;
        }

        const civitaiFileName = retrieveCivitaiFileName(parentModelObject, parentVersionId);
        const civitaiModelFileList = retrieveCivitaiFilesList(parentModelObject, parentVersionId);

        if (
            !parentModelUrl ||
            !parentModelID ||
            !subVersionID ||
            !civitaiFileName ||
            !finalDownloadFilePath ||
            !civitaiModelFileList?.length
        ) {
            dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
            return;
        }

        if (offlineMode) {
            const civitaiTags = parentModelObject?.tags;

            if (!resolvedSelectedCategory || civitaiTags == null) {
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
                return;
            }

            const offlineModelObject = {
                downloadFilePath: finalDownloadFilePath,
                civitaiFileName,
                civitaiModelID: parentModelID,
                civitaiVersionID: parentVersionId,
                civitaiModelFileList,
                civitaiUrl: parentModelUrl,
                selectedCategory: resolvedSelectedCategory,
                civitaiTags,
            };

            await fetchAddOfflineDownloadFileIntoOfflineDownloadList(
                offlineModelObject,
                false,
                dispatch
            );

            await fetchRemoveRecordFromDatabaseByID(subRowId, dispatch);
            await fetchMoveModelVersionFilesToDelete(dispatch, subModelID, subVersionID);

            markUpdatedAndClose();
            return;
        }

        const downloadModelObject = {
            downloadFilePath: finalDownloadFilePath,
            civitaiFileName,
            civitaiModelID: parentModelID,
            civitaiVersionID: parentVersionId,
            civitaiModelFileList,
            civitaiUrl: parentModelUrl,
        };

        if (downloadMethod === "server") {
            await fetchDownloadFilesByServer_v2(downloadModelObject, dispatch);
        } else {
            await fetchDownloadFilesByBrowser_v2(parentModelUrl, finalDownloadFilePath, dispatch);

            try {
                const versionObject = await fetchCivitaiModelInfoFromCivitaiByVersionID(
                    parentVersionId,
                    dispatch
                );

                if (versionObject) {
                    callChromeBrowserDownload_v2({
                        ...downloadModelObject,
                        modelVersionObject: versionObject,
                    });
                } else {
                    throw new Error();
                }
            } catch (error) {
                console.error("Error fetching data for subVersionID:", subVersionID, error);
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
                return;
            }
        }

        await fetchAddRecordToDatabase(
            resolvedSelectedCategory,
            resolvedUrl,
            finalDownloadFilePath,
            dispatch
        );

        await fetchRemoveRecordFromDatabaseByID(subRowId, dispatch);
        await fetchMoveModelVersionFilesToDelete(dispatch, subModelID, subVersionID);

        const bookmarkValue =
            parentModelObject?.type ||
            props.selectedVersion?.baseModel ||
            resolvedModelData?.type ||
            "";

        if (bookmarkValue) {
            bookmarkThisModel(bookmarkValue, dispatch);
        }

        markUpdatedAndClose();
    };

    const handleUpdateModel = async (id: number) => {
        setIsLoading(true);
        dispatch(clearError());

        try {
            if (!resolvedUrl || !resolvedSelectedCategory || id == null) {
                dispatch(setError({ hasError: true, errorMessage: "Empty Inputs" }));
                return;
            }

            const clickedModel = modelsList.find((m) => m.id === id);

            if (!clickedModel) {
                dispatch(setError({ hasError: true, errorMessage: "Clicked model not found" }));
                return;
            }

            const selectedUpdateOption =
                updateOptionById[id] || getDefaultUpdateOptionForModel(clickedModel);

            if (!selectedUpdateOption) {
                dispatch(setError({ hasError: true, errorMessage: "No valid update option available" }));
                return;
            }

            let selectedPath = "";

            switch (selectedUpdateOption) {
                case "Database_and_LocalUpdateFolder": {
                    const localScanPath = normalizeLocalPathToScanPath(clickedModel?.localPath);
                    const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                    selectedPath = localUpdatePath || UpdateDownloadFilePath;
                    break;
                }
                case "Database_and_LocalFileFolder":
                    await handleDatabaseAndLocalFileFolderUpdate(id);
                    return;
                case "Database_and_UpdateFolder":
                    selectedPath = UpdateDownloadFilePath;
                    break;
                case "Database_Only":
                    selectedPath = resolvedDownloadFilePath;
                    break;
                default:
                    selectedPath = "/@scan@/ACG/Temp/";
                    break;
            }

            if (isPendingPath(selectedPath)) {
                dispatch(setError({
                    hasError: true,
                    errorMessage: "Pending path is not allowed for this update option",
                }));
                return;
            }

            syncDownloadFilePath(selectedPath);

            await fetchUpdateRecordAtDatabase(id, resolvedUrl, resolvedSelectedCategory, dispatch);

            if (selectedUpdateOption !== "Database_Only") {
                if (offlineMode) {
                    await handleAddOfflineDownloadFileintoOfflineDownloadList(selectedPath);
                } else {
                    await handleDownload_v2(selectedPath);
                }
            } else {
                const bookmarkValue =
                    props.selectedVersion?.baseModel ||
                    resolvedModelData?.type ||
                    resolvedModelData?.baseModel ||
                    "";

                if (bookmarkValue) {
                    bookmarkThisModel(bookmarkValue, dispatch);
                }

                markUpdatedAndClose();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => (
        <>
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                    paddingBottom: "12px",
                    borderBottom: `1px solid ${theme.panelBorder}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <OverlayTrigger
                        placement="top"
                        container={document.body}
                        overlay={
                            <Tooltip id="tooltip-reverse-model-list" style={{ zIndex: 20000 }}>
                                Reverse current model order
                            </Tooltip>
                        }
                    >
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={handleReverseModelList}
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                background: theme.buttonBackground,
                                color: theme.buttonText,
                                border: `1px solid ${theme.buttonBorder}`,
                                boxShadow: theme.buttonShadow,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            {isLoading ? (
                                <BsArrowRepeat className="spinner" />
                            ) : isSorted ? (
                                <BsSortUp />
                            ) : (
                                <BsSortDown />
                            )}
                        </button>
                    </OverlayTrigger>

                    <button
                        type="button"
                        onClick={handleToggleColapPanel}
                        style={{
                            border: `1px solid ${theme.buttonBorder}`,
                            background: theme.buttonBackground,
                            color: theme.buttonText,
                            borderRadius: "10px",
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: theme.buttonShadow,
                        }}
                    >
                        <FaFilter />
                        Base Model Filter
                        {isColapPanelOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>
                </div>

                <div
                    style={{
                        fontSize: "13px",
                        color: theme.buttonText,
                        border: `1px solid ${theme.buttonBorder}`,
                        background: theme.buttonBackground,
                        borderRadius: "10px",
                        padding: "10px 12px",
                    }}
                >
                    {modelsList?.length || 0} records
                </div>
            </div>

            <Collapse in={isColapPanelOpen}>
                <div
                    id="collapse-panel-update"
                    style={{
                        marginBottom: "16px",
                        padding: "12px",
                        borderRadius: "12px",
                        border: `1px solid ${theme.buttonBorder}`,
                        background: theme.buttonBackground,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px 16px",
                        }}
                    >
                        {baseModelList.map((item, index) => (
                            <label
                                key={item.baseModel}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "14px",
                                    color: theme.buttonText,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.display}
                                    onChange={() => handleToggleBaseModelCheckbox(index)}
                                />
                                {item.baseModel}
                            </label>
                        ))}
                    </div>
                </div>
            </Collapse>

            {isLoading ? (
                <div
                    style={{
                        minHeight: "180px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Spinner animation="border" />
                </div>
            ) : (
                <>
                    {modelsList.map((model) => {
                        const localScanPath = normalizeLocalPathToScanPath(model?.localPath);
                        const localUpdatePath = buildUpdatePathFromScanPath(localScanPath);
                        const isSameBaseModel =
                            (model?.baseModel || "").toLowerCase() === selectedBaseModel.toLowerCase();

                        const availableOptions = getAvailableOptionsForModel(model);
                        const selectedUpdateOption =
                            updateOptionById[model.id] || getDefaultUpdateOptionForModel(model);

                        const canUseLocalUpdateFolder = availableOptions.includes("Database_and_LocalUpdateFolder");
                        const canUseUpdateFolder = availableOptions.includes("Database_and_UpdateFolder");
                        const canUseDatabaseOnly = availableOptions.includes("Database_Only");
                        const hasAnySelectableOption = availableOptions.length > 0;
                        const radioName = `update-option-${model.id}`;

                        if (hiddenToastIds.includes(model.id)) return null;

                        return (
                            <div
                                key={model.id}
                                style={{
                                    marginBottom: "14px",
                                }}
                            >
                                <Toast
                                    onClose={() => handleClose(model.id)}
                                    style={{
                                        width: "100%",
                                        borderRadius: "16px",
                                        background: isSameBaseModel
                                            ? theme.rowBackgroundColor
                                            : theme.panelBackground,
                                        border: isSameBaseModel
                                            ? `2px solid ${theme.buttonBorder}`
                                            : `1px solid ${theme.panelBorder}`,
                                        color: theme.panelText,
                                        boxShadow: theme.buttonShadow,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Toast.Header
                                        closeButton
                                        style={{
                                            background: theme.rowBackgroundColor,
                                            borderBottom: `1px solid ${theme.panelBorder}`,
                                            padding: "12px 14px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: "12px",
                                            }}
                                        >
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div
                                                    style={{
                                                        marginBottom: "6px",
                                                        display: "flex",
                                                        gap: "8px",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Badge bg="primary">{model?.baseModel}</Badge>

                                                    {isSameBaseModel && (
                                                        <Badge bg="success">Same Base Model</Badge>
                                                    )}
                                                </div>

                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        color: theme.panelText,
                                                        lineHeight: 1.35,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        flexWrap: "nowrap",
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            minWidth: 0,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {resolvedModelID}_{model?.versionNumber ?? "Unknown"} : {model?.name}
                                                    </span>

                                                    {!!resolvedModelID && !!model?.versionNumber && (
                                                        <ModelVersionFileExistsBadge
                                                            modelID={String(resolvedModelID)}
                                                            versionID={String(model.versionNumber)}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {cartedById[model.id] ? (
                                                <OverlayTrigger
                                                    placement="top"
                                                    container={document.body}
                                                    overlay={
                                                        <Tooltip
                                                            id={`tooltip-carted-${model.id}`}
                                                            style={{ zIndex: 20000 }}
                                                        >
                                                            Already in cart
                                                        </Tooltip>
                                                    }
                                                >
                                                    <div
                                                        style={{
                                                            color: theme.panelText,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <BsFillCartCheckFill size={18} />
                                                    </div>
                                                </OverlayTrigger>
                                            ) : null}
                                        </div>
                                    </Toast.Header>

                                    <Toast.Body style={{ padding: "14px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "14px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    borderRadius: "12px",
                                                    overflow: "hidden",
                                                    border: `1px solid ${theme.panelBorder}`,
                                                    background: theme.rowBackgroundColor,
                                                }}
                                            >
                                                {model?.imageUrls?.[0]?.url ? (
                                                    <Carousel fade interval={null}>
                                                        {model?.imageUrls?.map((image, imgIndex) => (
                                                            <Carousel.Item key={`${model.id}-${imgIndex}`}>
                                                                <div
                                                                    style={{
                                                                        height: "260px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        background: theme.panelBackground,
                                                                    }}
                                                                >
                                                                    <SmartImage
                                                                        src={image.url || "https://placehold.co/200x250"}
                                                                        alt={model.name}
                                                                        isDarkMode={resolvedIsDarkMode}
                                                                        maxHeight="260px"
                                                                        borderRadius={0}
                                                                        loading="lazy"
                                                                        showRetryButton={false}
                                                                    />
                                                                </div>
                                                            </Carousel.Item>
                                                        ))}
                                                    </Carousel>
                                                ) : (
                                                    <div
                                                        style={{
                                                            height: "180px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: theme.subText,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        No image available
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: "13px",
                                                    background: theme.rowBackgroundColor,
                                                    border: `1px solid ${theme.panelBorder}`,
                                                    color: theme.panelText,
                                                    borderRadius: "10px",
                                                    padding: "10px 12px",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        color: theme.panelText,
                                                        marginBottom: "6px",
                                                    }}
                                                >
                                                    URL
                                                </div>
                                                <a
                                                    href={model?.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: "#0d6efd", textDecoration: "none" }}
                                                >
                                                    {model?.url}
                                                </a>
                                            </div>

                                            <div
                                                style={{
                                                    border: `1px solid ${theme.panelBorder}`,
                                                    background: theme.panelBackground,
                                                    padding: "12px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        color: theme.panelText,
                                                        marginBottom: "10px",
                                                    }}
                                                >
                                                    Update Options
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    <LocalFileFolderOption
                                                        modelID={String(model?.modelNumber ?? "")}
                                                        versionID={String(model?.versionNumber ?? "")}
                                                        localScanPath={localScanPath}
                                                        updateOption={selectedUpdateOption}
                                                        setUpdateOption={(value) =>
                                                            setUpdateOptionForModel(model.id, value)
                                                        }
                                                        onAvailabilityChange={(isAvailable) =>
                                                            setLocalFileFolderAvailableForModel(model.id, isAvailable)
                                                        }
                                                        theme={theme}
                                                        radioName={radioName}
                                                    />

                                                    {canUseLocalUpdateFolder && (
                                                        <label
                                                            style={radioCardStyle(
                                                                selectedUpdateOption === "Database_and_LocalUpdateFolder"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={radioName}
                                                                value="Database_and_LocalUpdateFolder"
                                                                checked={
                                                                    selectedUpdateOption === "Database_and_LocalUpdateFolder"
                                                                }
                                                                onChange={() =>
                                                                    setUpdateOptionForModel(
                                                                        model.id,
                                                                        "Database_and_LocalUpdateFolder"
                                                                    )
                                                                }
                                                            />
                                                            <span style={{ wordBreak: "break-word" }}>
                                                                Add the Parent to this PC&apos;s {localUpdatePath},
                                                                and Remove the Sub Record from Database
                                                            </span>
                                                        </label>
                                                    )}

                                                    {canUseUpdateFolder && (
                                                        <label
                                                            style={radioCardStyle(
                                                                selectedUpdateOption === "Database_and_UpdateFolder"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={radioName}
                                                                value="Database_and_UpdateFolder"
                                                                checked={selectedUpdateOption === "Database_and_UpdateFolder"}
                                                                onChange={() =>
                                                                    setUpdateOptionForModel(
                                                                        model.id,
                                                                        "Database_and_UpdateFolder"
                                                                    )
                                                                }
                                                            />
                                                            <span style={{ wordBreak: "break-word" }}>
                                                                Add the Parent to this PC&apos;s {UpdateDownloadFilePath}
                                                                and Remove the Sub Record from Database
                                                            </span>
                                                        </label>
                                                    )}

                                                    {canUseDatabaseOnly && (
                                                        <label
                                                            style={radioCardStyle(
                                                                selectedUpdateOption === "Database_Only"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={radioName}
                                                                value="Database_Only"
                                                                checked={selectedUpdateOption === "Database_Only"}
                                                                onChange={() =>
                                                                    setUpdateOptionForModel(model.id, "Database_Only")
                                                                }
                                                            />
                                                            <span>
                                                                Replace the Parent to the Sub in Database Only
                                                            </span>
                                                        </label>
                                                    )}

                                                    {!hasAnySelectableOption && (
                                                        <div
                                                            style={{
                                                                padding: "10px 12px",
                                                                borderRadius: "8px",
                                                                border: `1px solid ${theme.panelBorder}`,
                                                                backgroundColor: theme.headerBackgroundColor,
                                                                color: theme.headerFontColor,
                                                                wordBreak: "break-word",
                                                            }}
                                                        >
                                                            Update disabled because the downloadFilePath cannot be a Pending path.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isLoading || !hasAnySelectableOption}
                                                onClick={() => void handleUpdateModel(model?.id)}
                                                style={{
                                                    width: "100%",
                                                    border: "none",
                                                    borderRadius: "12px",
                                                    padding: "12px 16px",
                                                    background: offlineMode ? "#198754" : "#0d6efd",
                                                    color: "#fff",
                                                    fontWeight: 700,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "8px",
                                                    cursor: isLoading || !hasAnySelectableOption ? "not-allowed" : "pointer",
                                                    opacity: hasAnySelectableOption ? 1 : 0.65,
                                                    boxShadow: offlineMode
                                                        ? "0 4px 12px rgba(25, 135, 84, 0.25)"
                                                        : "0 4px 12px rgba(13, 110, 253, 0.25)",
                                                }}
                                            >
                                                <BsFillFileEarmarkArrowUpFill />
                                                <span>{offlineMode ? "Update & Queue Offline" : "Update & Download"}</span>
                                            </button>
                                        </div>
                                    </Toast.Body>
                                </Toast>
                            </div>
                        );
                    })}
                </>
            )}
        </>
    );

    if (isEmbeddedMode) {
        return <>{renderContent()}</>;
    }

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
                onClick={handleClosePanel}
                style={{
                    backgroundColor: theme.headerBackgroundColor,
                    color: theme.headerFontColor,
                    border: `1px solid ${theme.evenRowBackgroundColor}`,
                    borderRadius: "8px",
                    boxShadow: resolvedIsDarkMode
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
                    padding: "12px",
                }}
            >
                <div
                    className="panel-header-text"
                    style={{
                        color: theme.panelText,
                        marginBottom: "12px",
                    }}
                >
                    <h6>Database&apos;s Update Model Panel</h6>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default DatabaseUpdateModelPanel;