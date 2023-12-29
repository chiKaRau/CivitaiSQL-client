import { SET_ERROR, CLEAR_ERROR } from '../constants/ErrorsActionTypes';

//Add Error title
export const setError = (newPayload: { hasError: boolean; errorMessage: string }) => ({
    type: SET_ERROR,
    payload: newPayload,
});

export const clearError = () => ({
    type: CLEAR_ERROR,
});

