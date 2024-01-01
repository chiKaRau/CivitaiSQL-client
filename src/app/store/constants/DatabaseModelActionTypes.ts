// Define action types
export const UPDATE_IS_IN_DATABASE = 'UPDATE_IS_IN_DATABASE';
export const UPDATE_DATABASE_MODEL_OBJECT = 'UPDATE_DATABASE_MODEL_OBJECT';

export interface UpdateIsInDatabase {
    type: typeof UPDATE_IS_IN_DATABASE;
    payload: boolean;
}


export interface UpdateDatabaseModelObject {
    type: typeof UPDATE_DATABASE_MODEL_OBJECT;
    payload: object;
}

export type DatabaseModelActionTypes = UpdateIsInDatabase | UpdateDatabaseModelObject;