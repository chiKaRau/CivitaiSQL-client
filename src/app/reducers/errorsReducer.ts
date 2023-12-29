import { ErrorsActionTypes } from '../constants/ErrorsActionTypes';

// reducers/userReducer.ts
interface ErrorsState {
    hasError: boolean;
    errorMessage: string;

}

const initialState: ErrorsState = {
    hasError: false,
    errorMessage: '',
};

const errorsReducer = (state = initialState, action: ErrorsActionTypes): ErrorsState => {
    switch (action.type) {
        case 'SET_ERROR':
            return {
                ...state,
                hasError: action.payload.hasError,
                errorMessage: action.payload.errorMessage,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                hasError: false,
                errorMessage: '',
            };
        default:
            return state;
    }
};

export default errorsReducer;
export type { ErrorsState }; // Export UserState type for reuse
