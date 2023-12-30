import React, { useEffect, useState, useRef } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { updateCategoriesList, updateSelectedCategory } from "../store/actions/chromeActions"

//api
import { getCategoriesList } from "../api/civitaiSQL_api"
import { initializeDatafromChromeStorage, updateSelectedCategoryIntoChromeStorage } from "../utils/chromeUtils"

//components
import { Form } from 'react-bootstrap';

const CategoriesListSelector: React.FC = () => {
    const isInitialMount = useRef(true);

    const chrome = useSelector((state: AppState) => state.chrome);
    const { selectedCategory, categoriesList } = chrome;

    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        //Preventing First time update
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            updateSelectedCategoryIntoChromeStorage(selectedCategory);
        }
    }, [selectedCategory]);

    useEffect(() => {
        initializeDatafromChromeStorage(dispatch);
        setupCategoriesInfo()
    }, [])

    const setupCategoriesInfo = async () => {
        setIsLoading(true)
        const data = await getCategoriesList(dispatch);
        dispatch(updateCategoriesList(data));
        setIsLoading(false)
    }

    return (
        <div className="selector-container">
            <Form className="selector-form-container">
                <Form.Group controlId="selectSheet" className="selector-form-group ">
                    <Form.Label className="selector-form-label">Select Sheet:</Form.Label>
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
        </div>
    );
};

export default CategoriesListSelector;

