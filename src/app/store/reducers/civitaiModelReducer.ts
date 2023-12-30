// reducers/counterReducer.ts
import { CivitaiModelActionTypes } from '../constants/CivitaiModelActionTypes';

interface CivitaiModelState {
    civitaiUrl: string;
    civitaiModelID: string;
    civitaiVersionID: string;
    civitaiModelObject: object;
    selectedCategory: string;
    categoryList: String[];
}

const initialState: CivitaiModelState = {
    civitaiUrl: "",
    civitaiModelID: "",
    civitaiVersionID: "",
    civitaiModelObject: {},
    selectedCategory: "",
    categoryList: [],
};

const civitaiModelReducer = (state = initialState, action: CivitaiModelActionTypes): CivitaiModelState => {
    switch (action.type) {
        case 'UPDATE_CIVITAI_URL':
            return { ...state, civitaiUrl: action.payload };
        case 'UPDATE_CIVITAI_MODELID':
            return { ...state, civitaiModelID: action.payload };
        case 'UPDATE_CIVITAI_VERSIONID':
            return { ...state, civitaiVersionID: action.payload };
        case 'UPDATE_CIVITAI_MODEL_OBJECT':
            return { ...state, civitaiModelObject: action.payload };
        case 'UPDATE_SELECTED_CATEGORY':
            return { ...state, selectedCategory: action.payload };
        case 'UPDATE_CATEGORY_LIST':
            return { ...state, categoryList: action.payload };

        default:
            return state;
    }
};

export default civitaiModelReducer;
export type { CivitaiModelState }
