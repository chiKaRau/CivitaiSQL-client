import React, { useEffect, useState } from 'react';

// Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateCategoriesList, updateSelectedCategory } from "../store/actions/chromeActions";

// api
import { fetchGetCategoriesList } from "../api/civitaiSQL_api";

// utils
import { initializeDatafromChromeStorage } from "../utils/chromeUtils";

// components
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BiCategory } from "react-icons/bi";
import { CiWarning } from "react-icons/ci";
import { AppTheme, darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';

interface CategoriesListSelectorProps {
    downloadFilePath?: string;
    selectedCategory?: string;
    setSelectCategory?: (category: string) => void;
    theme?: AppTheme;
    isDarkMode?: boolean;
}

const CategoriesListSelector: React.FC<CategoriesListSelectorProps> = ({
    downloadFilePath,
    selectedCategory,
    setSelectCategory,
    theme: passedTheme,
    isDarkMode: passedIsDarkMode,
}) => {
    const chrome = useSelector((state: AppState) => state.chrome);
    const {
        selectedCategory: chromeSelectedCategory,
        categoriesList,
        downloadFilePath: chromeDownloadFilePath,
        isDarkMode: chromeIsDarkMode
    } = chrome;

    const effectiveIsDarkMode = passedIsDarkMode ?? chromeIsDarkMode;
    const theme = passedTheme ?? (effectiveIsDarkMode ? darkTheme : lightTheme);

    const effectiveSelectedCategory = selectedCategory ?? chromeSelectedCategory ?? "";
    const effectiveDownloadFilePath = downloadFilePath ?? chromeDownloadFilePath ?? "";
    const effectiveCategoriesList = categoriesList ?? [];

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [notMatchSelector, setNotMatchSelector] = useState(false);

    const applySelectedCategory = (nextCategory: string) => {
        if (setSelectCategory) {
            setSelectCategory(nextCategory);
        }
        dispatch(updateSelectedCategory(nextCategory));
    };

    useEffect(() => {
        if (downloadFilePath === undefined && selectedCategory === undefined) {
            initializeDatafromChromeStorage(dispatch);
        }

        void setupCategoriesInfo();
        handleCheckNotMatchSelector();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        updateSelectedCategoryByFilePath();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveDownloadFilePath, effectiveCategoriesList]);

    useEffect(() => {
        handleCheckNotMatchSelector();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveSelectedCategory, effectiveDownloadFilePath]);

    const setupCategoriesInfo = async () => {
        setIsLoading(true);
        try {
            const data = await fetchGetCategoriesList(dispatch);
            dispatch(updateCategoriesList(data ?? []));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckNotMatchSelector = () => {
        const safePath = effectiveDownloadFilePath ?? "";
        const safeCategory = effectiveSelectedCategory ?? "";
        setNotMatchSelector(!safePath.replace(/\(.*?\)/g, '').includes(safeCategory));
    };

    const updateSelectedCategoryByFilePath = () => {
        const safePath = effectiveDownloadFilePath ?? "";
        const safeCategoriesList = effectiveCategoriesList ?? [];

        let pathArray: string[] = [];

        for (let category of safeCategoriesList) {
            if (category === "Type Character") {
                pathArray.push("Type");
            } else {
                pathArray.push(category);
            }
        }

        let firstMatch: string | null = null;

        if (safePath.length > 0) {
            for (let category of pathArray) {
                if (safePath.includes(category)) {
                    if (firstMatch === null || safePath.indexOf(category) < safePath.indexOf(firstMatch)) {
                        firstMatch = category;
                    }
                }
            }
        }

        if (safePath.includes("/Pending/")) {
            firstMatch = "Characters";
        }

        if (safePath.includes("Type")) {
            firstMatch = "Type Character";
        }

        if (safePath.includes("Males")) {
            firstMatch = "Males";
        }

        if (safePath.includes("Graphic Element/")) {
            firstMatch = "Art";
        }

        if (safePath.includes("/Style/")) {
            if (safePath.includes("Checkpoint")) {
                firstMatch = "Art";
            }
        }

        if (safePath.includes("Art")) {
            if (safePath.includes("Artist")) {
                if (safePath.includes("OTK")) {
                    firstMatch = "OTK";
                } else {
                    firstMatch = "Artist";
                }
            } else {
                if (safePath.includes("SAO")) {
                    firstMatch = "Characters";
                } else {
                    firstMatch = "Art";
                }
            }
        }

        if (firstMatch === null) {
            firstMatch = effectiveSelectedCategory ?? "";
        }

        if (firstMatch !== effectiveSelectedCategory) {
            applySelectedCategory(firstMatch);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
            }}
        >
            <Form style={{ flex: 1, minWidth: 0, margin: 0 }}>
                <Form.Group controlId="selectSheet" style={{ margin: 0 }}>
                    <Form.Label
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: theme.panelText,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <BiCategory />
                        Category
                    </Form.Label>

                    <Form.Select
                        value={effectiveSelectedCategory}
                        disabled={isLoading}
                        onChange={(event) => {
                            applySelectedCategory(event.target.value);
                        }}
                        style={{
                            borderRadius: '10px',
                            border: `1px solid ${theme.panelBorder}`,
                            padding: '10px 12px',
                            fontSize: '14px',
                            boxShadow: 'none',
                            background: theme.panelBackground,
                            color: theme.panelText,
                        }}
                    >
                        <option
                            value=""
                            style={{
                                background: theme.panelBackground,
                                color: theme.panelText,
                            }}
                        >
                            Select an option
                        </option>

                        {effectiveCategoriesList?.map((element, index) => (
                            <option
                                key={index}
                                value={element}
                                style={{
                                    background: theme.panelBackground,
                                    color: theme.panelText,
                                }}
                            >
                                {element}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Form>

            {notMatchSelector && (
                <OverlayTrigger
                    placement="top"
                    container={document.body}
                    overlay={
                        <Tooltip id="tooltip-category-warning" style={{ zIndex: 20000 }}>
                            Current folder path does not seem to match the selected category.
                        </Tooltip>
                    }
                >
                    <div
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '999px',
                            background: effectiveIsDarkMode ? '#4a3f16' : '#fff3cd',
                            border: effectiveIsDarkMode ? '1px solid #8a6d3b' : '1px solid #ffe08a',
                            color: effectiveIsDarkMode ? '#ffd966' : '#8a6d3b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '24px',
                        }}
                    >
                        <CiWarning size={18} />
                    </div>
                </OverlayTrigger>
            )}
        </div>
    );
};

export default CategoriesListSelector;