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
import { Form } from 'react-bootstrap';
import { BiCategory } from "react-icons/bi";
import { CiWarning } from "react-icons/ci";
import { darkTheme, lightTheme } from './window_offline/OfflineWindow.theme';

const CategoriesListSelector: React.FC = () => {
    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, categoriesList, downloadFilePath, isDarkMode } = chrome;

    const theme = isDarkMode ? darkTheme : lightTheme;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [notMatchSelector, setNotMatchSelector] = useState(false);

    useEffect(() => {
        initializeDatafromChromeStorage(dispatch);
        setupCategoriesInfo();
        handleCheckNotMatchSelector();
    }, []);

    useEffect(() => {
        updateSelectedCategoryByFilePath();
    }, [downloadFilePath, categoriesList]);

    useEffect(() => {
        handleCheckNotMatchSelector();
    }, [selectedCategory, downloadFilePath]);

    const setupCategoriesInfo = async () => {
        setIsLoading(true);
        const data = await fetchGetCategoriesList(dispatch);
        dispatch(updateCategoriesList(data));
        setIsLoading(false);
    };

    const handleCheckNotMatchSelector = () => {
        const safePath = downloadFilePath ?? "";
        const safeCategory = selectedCategory ?? "";
        setNotMatchSelector(!safePath.replace(/\(.*?\)/g, '').includes(safeCategory));
    };

    const updateSelectedCategoryByFilePath = () => {
        const safePath = downloadFilePath ?? "";
        const safeCategoriesList = categoriesList ?? [];

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
            firstMatch = selectedCategory ?? "";
        }

        dispatch(updateSelectedCategory(firstMatch));
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme.panelText,
            }}
        >
            <Form
                style={{
                    margin: 0,
                    width: '100%',
                }}
            >
                <Form.Group
                    controlId="selectSheet"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: 0,
                    }}
                >
                    <Form.Label
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: theme.panelText,
                            marginBottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <BiCategory />
                    </Form.Label>

                    <Form.Select
                        value={selectedCategory ?? ""}
                        disabled={isLoading}
                        onChange={(event) => {
                            dispatch(updateSelectedCategory(event.target.value));
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

                        {categoriesList?.map((element, index) => (
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
                <div
                    style={{
                        paddingLeft: "5px",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: isDarkMode ? '#4a3f16' : '#fff3cd',
                        border: isDarkMode ? '1px solid #8a6d3b' : '1px solid #ffe08a',
                        color: isDarkMode ? '#ffd966' : '#8a6d3b',
                    }}
                    title="Selected category does not match current folder path"
                >
                    <CiWarning />
                </div>
            )}
        </div>
    );
};

export default CategoriesListSelector;