import React, { useEffect, useState } from 'react';

//Store
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';
import { clearError } from '../actions/errorsActions';

//Componenets
import { Alert } from 'react-bootstrap';

const ErrorAlert: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    const errors = useSelector((state: AppState) => state.errors);
    const dispatch = useDispatch();

    const { hasError, errorMessage } = errors;
    return (
        <>
            {hasError && <p> {errorMessage}</p>}
            <Alert show={hasError} variant="success" onClose={() => { dispatch(clearError()) }} dismissible>
                <p> {errorMessage} </p>
            </Alert>
        </>
    );
};
export default ErrorAlert;

