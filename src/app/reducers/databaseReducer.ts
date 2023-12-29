// reducers/counterReducer.ts
import { DatabaseActionTypes, UPDATE_ISINDATABASE, UPDATE_DATABASE_MODEL_OBJECT } from '../constants/DatabaseActionTypes copy';

interface DatabaseState {
    isInDatabase: boolean;
    databaseModelObject: object;
}

const initialState: DatabaseState = {
    isInDatabase: false,
    databaseModelObject: {},
};

const databaseReducer = (state = initialState, action: DatabaseActionTypes): DatabaseState => {
    switch (action.type) {
        case 'UPDATE_ISINDATABASE':
            return { ...state, isInDatabase: action.payload };
        case 'UPDATE_DATABASE_MODEL_OBJECT':
            return { ...state, databaseModelObject: action.payload };
        default:
            return state;
    }
};

export default databaseReducer;
export type { DatabaseState }
