// ReduxStore/store/index.ts
import { createStore, combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import civitaiModelReducer, { CivitaiModelState } from './reducers/civitaiModelReducer';
import errorsReducer, { ErrorsState } from './reducers/errorsReducer';
import loadingReducer, { LoadingState } from './reducers/loadingReducer';
import panelReducer, { PanelState } from './reducers/panelReducer';
import databaseModelReducer, { DatabaseModelState } from './reducers/databaseModelReducer';


// Define the root state type
interface RootState {
    civitaiModel: CivitaiModelState;
    errors: ErrorsState;
    loading: LoadingState;
    panel: PanelState;
    databaseModel: DatabaseModelState;
    // Add other slices as needed
}

// Combine reducers
const rootReducer = combineReducers({
    civitaiModel: civitaiModelReducer,
    errors: errorsReducer,
    loading: loadingReducer,
    panel: panelReducer,
    databaseModel: databaseModelReducer
    // Add other slices as needed
});

const store = configureStore({
    reducer: rootReducer,
});

export default store;
export type AppState = ReturnType<typeof rootReducer>;
