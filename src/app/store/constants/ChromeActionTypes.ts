// Define action types
export const UPDATE_BOOKMARKID = 'UPDATE_BOOKMARKID';
export const SET_ISBOOKMARKED = 'SET_ISBOOKMARKED';
export const UPDATE_SELECTED_CATEGORY = 'UPDATE_SELECTED_CATEGORY';
export const UPDATE_CATEGORIES_LIST = 'UPDATE_CATEGORIES_LIST';
export const UPDATE_DOWNLOAD_FILEPATH = 'UPDATE_DOWNLOAD_FILEPATH';
export const UPDATE_DOWNLOAD_METHOD = 'UPDATE_DOWNLOAD_METHOD';
export const UPDATE_SELECTED_FILTERED_CATEGORIES_LIST = 'UPDATE_SELECTED_FILTERED_CATEGORIES_LIST';

export interface UpdateBookmarkID {
    type: typeof UPDATE_BOOKMARKID;
    payload: string;
}

export interface SetIsBookmarked {
    type: typeof SET_ISBOOKMARKED;
    payload: boolean;
};

export interface UpdateSelectedCategoryAction {
    type: typeof UPDATE_SELECTED_CATEGORY;
    payload: string;
}

export interface UpdateCategoriesListAction {
    type: typeof UPDATE_CATEGORIES_LIST;
    payload: string[];
}

export interface UpdateDownloadFilePathAction {
    type: typeof UPDATE_DOWNLOAD_FILEPATH;
    payload: string;
}

export interface UpdateDownloadMethodAction {
    type: typeof UPDATE_DOWNLOAD_METHOD;
    payload: string;
}

export interface UpdateSelectedFilteredCategoriesListAction {
    type: typeof UPDATE_SELECTED_FILTERED_CATEGORIES_LIST;
    payload: string;
}

export type ChromeActionTypes = UpdateBookmarkID | SetIsBookmarked |
    UpdateSelectedCategoryAction | UpdateCategoriesListAction |
    UpdateDownloadFilePathAction | UpdateDownloadMethodAction |
    UpdateSelectedFilteredCategoriesListAction;