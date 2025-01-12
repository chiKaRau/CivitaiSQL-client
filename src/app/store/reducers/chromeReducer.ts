// reducers/counterReducer.ts
import { ChromeActionTypes } from '../constants/ChromeActionTypes';

interface ChromeState {
    bookmarkID: string;
    isBookmarked: boolean;
    selectedCategory: string;
    categoriesList: string[];
    selectedFilteredCategoriesList: string;
    downloadFilePath: string;
    downloadMethod: string;
    offlineMode: boolean;
}

const initialState: ChromeState = {
    bookmarkID: "",
    isBookmarked: false,
    selectedCategory: "Characters",
    categoriesList: [],
    selectedFilteredCategoriesList: "",
    downloadFilePath: '/@scan@/ACG/Characters (Anime)/',
    downloadMethod: 'server',
    offlineMode: false
};

const chromelReducer = (state = initialState, action: ChromeActionTypes): ChromeState => {
    switch (action.type) {
        case 'UPDATE_BOOKMARKID':
            return { ...state, bookmarkID: action.payload };
        case 'SET_ISBOOKMARKED':
            return { ...state, isBookmarked: action.payload };
        case 'UPDATE_SELECTED_CATEGORY':
            return { ...state, selectedCategory: action.payload };
        case 'UPDATE_CATEGORIES_LIST':
            return { ...state, categoriesList: action.payload };
        case 'UPDATE_DOWNLOAD_FILEPATH':
            return { ...state, downloadFilePath: action.payload };
        case 'UPDATE_DOWNLOAD_METHOD':
            return { ...state, downloadMethod: action.payload };
        case 'UPDATE_SELECTED_FILTERED_CATEGORIES_LIST':
            return { ...state, selectedFilteredCategoriesList: action.payload };
        case 'UPDATE_OFFLINEMODE':
            return { ...state, offlineMode: action.payload };
        default:
            return state;
    }
};

export default chromelReducer;
export type { ChromeState }
