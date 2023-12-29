// Define action types
export const UPDATE_CIVITAI_URL = 'UPDATE_CIVITAI_URL';
export const UPDATE_CIVITAI_MODELID = 'UPDATE_CIVITAI_MODELID';
export const UPDATE_CIVITAI_VERSIONID = 'UPDATE_CIVITAI_VERSIONID';
export const UPDATE_CIVITAI_MODEL_OBJECT = 'UPDATE_CIVITAI_MODEL_OBJECT';
export const UPDATE_SELECTED_CATEGORY = 'UPDATE_SELECTED_CATEGORY';
export const UPDATE_CATEGORY_LIST = 'UPDATE_CATEGORY_LIST';
export const UPDATE_BOOKMARKID = 'UPDATE_BOOKMARKID';
export const SET_ISBOOKMARKED = 'SET_ISBOOKMARKED';

export interface UpdateCivtaiUrlAction {
    type: typeof UPDATE_CIVITAI_URL;
    payload: string;
}

export interface UpdateCivitaiModeIDAction {
    type: typeof UPDATE_CIVITAI_MODELID;
    payload: string;
}

export interface UpdateCivitaiVersionIDAction {
    type: typeof UPDATE_CIVITAI_VERSIONID;
    payload: string;
}

export interface UpdateCivitaiModelObject {
    type: typeof UPDATE_CIVITAI_MODEL_OBJECT;
    payload: object;
}

export interface UpdateSelectedCategoryAction {
    type: typeof UPDATE_SELECTED_CATEGORY;
    payload: string;
}

export interface UpdateCategoryListAction {
    type: typeof UPDATE_CATEGORY_LIST;
    payload: string[];
}


export interface UpdateBookmarkID {
    type: typeof UPDATE_BOOKMARKID;
    payload: string;
}

export interface SetIsBookmarked {
    type: typeof SET_ISBOOKMARKED;
    payload: boolean;
};

export type CivitaiModelActionTypes = UpdateCivtaiUrlAction | UpdateCivitaiModeIDAction | UpdateCivitaiVersionIDAction |
    UpdateSelectedCategoryAction | UpdateCategoryListAction | UpdateCivitaiModelObject |
    UpdateBookmarkID | SetIsBookmarked;