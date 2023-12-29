import { LoadingActionTypes } from '../constants/LoadingActionTypes';

// reducers/userReducer.ts
interface LoadingState {
    globalIsLoading: boolean;
}

const initialState: LoadingState = {
    globalIsLoading: false,
};

const loadingReducer = (state = initialState, action: LoadingActionTypes): LoadingState => {
    switch (action.type) {
        case 'SET_GLOBAL_ISLOADING':
            return {
                ...state,
                globalIsLoading: action.payload,
            };

        default:
            return state;
    }
};

export default loadingReducer;
export type { LoadingState }; // Export UserState type for reuse
