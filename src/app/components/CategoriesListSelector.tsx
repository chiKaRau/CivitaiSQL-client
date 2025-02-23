import React, { useEffect, useState, useRef } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateCategoriesList, updateSelectedCategory } from "../store/actions/chromeActions"

//api
import { fetchGetCategoriesList } from "../api/civitaiSQL_api"

//utils
import { initializeDatafromChromeStorage, updateSelectedCategoryIntoChromeStorage } from "../utils/chromeUtils"

//components
import { Form } from 'react-bootstrap';
import { BiCategory } from "react-icons/bi";
import { CiWarning } from "react-icons/ci";


const CategoriesListSelector: React.FC = () => {
    const isInitialMount = useRef(true);

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, categoriesList, downloadFilePath } = chrome;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)
    const [notMatchSelector, setNotMatchSelector] = useState(false)

    useEffect(() => {
        initializeDatafromChromeStorage(dispatch);
        setupCategoriesInfo()
        handleCheckNotMatchSelector();
    }, [])

    useEffect(() => {
        updateSelectedCategoryByFilePath()
    }, [downloadFilePath])

    useEffect(() => {
        handleCheckNotMatchSelector();
    }, [selectedCategory, downloadFilePath])

    //Update Chrome Storage
    /*
    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            //updateSelectedCategoryIntoChromeStorage(selectedCategory);
        }
    }, [selectedCategory]);
    */

    const setupCategoriesInfo = async () => {
        setIsLoading(true)
        const data = await fetchGetCategoriesList(dispatch);
        dispatch(updateCategoriesList(data));
        setIsLoading(false)
    }

    const handleCheckNotMatchSelector = () => {
        setNotMatchSelector(!downloadFilePath.replace(/\(.*?\)/g, '').includes(selectedCategory));
    }

    //TODO
    const updateSelectedCategoryByFilePath = () => {
        //Since DB tables name are different than folder, need to change name for matching
        let pathArray = []
        for (let category of categoriesList) {
            if (category === "Type Character") {
                pathArray.push("Type")
            } else {
                pathArray.push(category)
            }
        }

        //Find First Match
        let firstMatch = null;
        if (!(downloadFilePath === null || downloadFilePath.length === 0)) {
            for (let category of pathArray) {
                if (downloadFilePath.includes(category)) {
                    if (firstMatch === null || downloadFilePath.indexOf(category) < downloadFilePath.indexOf(firstMatch)) {
                        firstMatch = category;
                    }
                }
            }
        }

        if (downloadFilePath.includes("/Pending/")) {
            firstMatch = "Characters"
        }

        //Changing back for setting sheet
        if (downloadFilePath.includes("Type")) {
            firstMatch = "Type Character"
        }

        if (downloadFilePath.includes("Males")) {
            firstMatch = "Males"
        }

        if (downloadFilePath.includes("Graphic Element/")) {
            firstMatch = "Art"
        }

        if (downloadFilePath.includes("/Style/")) {
            if (downloadFilePath.includes("Checkpoint")) {
                firstMatch = "Art"
            }
        }

        if (downloadFilePath.includes("Art")) {
            if (downloadFilePath.includes("Artist")) {

                if (downloadFilePath.includes("OTK")) {
                    firstMatch = "OTK"
                } else {
                    firstMatch = "Artist"
                }

            } else {
                if (downloadFilePath.includes("SAO")) {
                    firstMatch = "Characters"
                } else {
                    firstMatch = "Art"
                }
            }
        }

        if (firstMatch === null) {
            firstMatch = selectedCategory
        }


        dispatch(updateSelectedCategory(firstMatch))
    }

    return (
        <div className="selector-container">
            <Form className="selector-form-container">
                <Form.Group controlId="selectSheet" className="selector-form-group ">
                    <Form.Label className="selector-form-label"><BiCategory /> </Form.Label>
                    <Form.Select
                        className="selector-form-select"
                        value={selectedCategory}
                        disabled={isLoading}
                        onChange={(event) => {
                            dispatch(updateSelectedCategory(event.target.value));
                        }}
                    >
                        <option value="">Select an option</option>
                        {categoriesList?.map((element, index) => (
                            <option key={index} value={element}>
                                {element}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Form>
            {notMatchSelector && <div style={{ paddingLeft: "5px" }}> <CiWarning /> </div>}
        </div>
    );
};

export default CategoriesListSelector;

