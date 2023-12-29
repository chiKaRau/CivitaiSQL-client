import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../store/configureStore';

// ModelList page
// Page which lists a bunch of models
const CivitaiModelsListScreen: React.FC = () => {
    //Redux Store will check which Reducer has the "state.[key]" then return appropriate value from the state
    //Any Changes and Updates in Reducer would trigger rerender
    //const counter = useSelector((state: AppState) => state.counter);
    //const user = useSelector((state: AppState) => state.user);

    //const dispatch = useDispatch();

    return (
        <div>
            <p> CivitaiModelsListScreen </p>
        </div>
    );
};

export default CivitaiModelsListScreen;

