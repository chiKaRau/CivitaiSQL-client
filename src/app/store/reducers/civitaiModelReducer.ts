// reducers/counterReducer.ts
import { CivitaiModelActionTypes } from '../constants/CivitaiModelActionTypes';

interface CivitaiModelState {
    civitaiUrl: string;
    civitaiModelID: string;
    civitaiVersionID: string;
    civitaiModelObject: object;
}

const initialState: CivitaiModelState = {
    civitaiUrl: "",
    civitaiModelID: "",
    civitaiVersionID: "",
    civitaiModelObject: {},
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
        default:
            return state;
    }
};

export default civitaiModelReducer;
export type { CivitaiModelState }
