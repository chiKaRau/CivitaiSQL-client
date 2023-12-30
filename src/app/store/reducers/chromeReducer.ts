// reducers/counterReducer.ts
import { ChromeActionTypes } from '../constants/ChromeActionTypes';

interface ChromeState {
    bookmarkID: string;
    isBookmarked: boolean;
}

const initialState: ChromeState = {
    bookmarkID: "",
    isBookmarked: false
};

const chromelReducer = (state = initialState, action: ChromeActionTypes): ChromeState => {
    switch (action.type) {
        case 'UPDATE_BOOKMARKID':
            return { ...state, bookmarkID: action.payload };
        case 'SET_ISBOOKMARKED':
            return { ...state, isBookmarked: action.payload };

        default:
            return state;
    }
};

export default chromelReducer;
export type { ChromeState }
