// Define action types
export const UPDATE_URL = 'UPDATE_URL';
export const UPDATE_MODELID = 'UPDATE_MODELID';
export const UPDATE_VERSIONID = 'UPDATE_VERSIONID';
export const UPDATE_SELECTED_CATEGORY = 'UPDATE_SELECTED_CATEGORY';
export const UPDATE_CATEGORY_LIST = 'UPDATE_CATEGORY_LIST';
export const UPDATE_MODEL_OBJECT = 'UPDATE_MODEL_OBJECT';
export const UPDATE_BOOKMARKID = 'UPDATE_BOOKMARKID';
export const SET_ISBOOKMARKED = 'SET_ISBOOKMARKED';

export interface UpdateUrlAction {
    type: typeof UPDATE_URL;
    payload: string;
}

export interface UpdateModeIDAction {
    type: typeof UPDATE_MODELID;
    payload: string;
}

export interface UpdateVersionIDAction {
    type: typeof UPDATE_VERSIONID;
    payload: string;
}

export interface UpdateSelectedCategoryAction {
    type: typeof UPDATE_SELECTED_CATEGORY;
    payload: string;
}

export interface UpdateCategoryListAction {
    type: typeof UPDATE_CATEGORY_LIST;
    payload: string[];
}

export interface UpdateModelObject {
    type: typeof UPDATE_MODEL_OBJECT;
    payload: object;
}

export interface UpdateBookmarkID {
    type: typeof UPDATE_BOOKMARKID;
    payload: string;
}

export interface SetIsBookmarked {
    type: typeof SET_ISBOOKMARKED;
    payload: boolean;
};

export type CivitaiModelActionTypes = UpdateUrlAction | UpdateModeIDAction | UpdateVersionIDAction |
    UpdateSelectedCategoryAction | UpdateCategoryListAction | UpdateModelObject |
    UpdateBookmarkID | SetIsBookmarked;