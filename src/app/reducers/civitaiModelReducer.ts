// reducers/counterReducer.ts
import { CivitaiModelActionTypes, UPDATE_BOOKMARKID } from '../constants/CivitaiModelActionTypes';

interface CivitaiModelState {
    url: string;
    modelID: string;
    versionID: string;
    selectedCategory: string;
    categoryList: String[];
    modelObject: object;
    bookmarkID: string;
    isBookmarked: boolean;
}

const initialState: CivitaiModelState = {
    url: "",
    modelID: "",
    versionID: "",
    selectedCategory: "",
    categoryList: [],
    modelObject: {},
    bookmarkID: "",
    isBookmarked: false
};

const civitaiModelReducer = (state = initialState, action: CivitaiModelActionTypes): CivitaiModelState => {
    switch (action.type) {
        case 'UPDATE_URL':
            return { ...state, url: action.payload };
        case 'UPDATE_MODELID':
            return { ...state, modelID: action.payload };
        case 'UPDATE_VERSIONID':
            return { ...state, versionID: action.payload };
        case 'UPDATE_SELECTED_CATEGORY':
            return { ...state, selectedCategory: action.payload };
        case 'UPDATE_CATEGORY_LIST':
            return { ...state, categoryList: action.payload };
        case 'UPDATE_MODEL_OBJECT':
            return { ...state, modelObject: action.payload };
        case 'UPDATE_BOOKMARKID':
            return { ...state, bookmarkID: action.payload };
        case 'SET_ISBOOKMARKED':
            return { ...state, isBookmarked: action.payload };

        default:
            return state;
    }
};

export default civitaiModelReducer;
export type { CivitaiModelState }
