// reducers/counterReducer.ts
import { DatabaseModelActionTypes } from '../constants/DatabaseModelActionTypes';

interface DatabaseModelState {
    isInDatabase: boolean;
    databaseModelObject: object;
}

const initialState: DatabaseModelState = {
    isInDatabase: false,
    databaseModelObject: {},
};

const databaseModelReducer = (state = initialState, action: DatabaseModelActionTypes): DatabaseModelState => {
    switch (action.type) {
        case 'UPDATE_IS_IN_DATABASE':
            return { ...state, isInDatabase: action.payload };
        case 'UPDATE_DATABASE_MODEL_OBJECT':
            return { ...state, databaseModelObject: action.payload };
        default:
            return state;
    }
};

export default databaseModelReducer;
export type { DatabaseModelState }
