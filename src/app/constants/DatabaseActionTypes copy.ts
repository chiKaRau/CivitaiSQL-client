// Define action types
export const UPDATE_ISINDATABASE = 'UPDATE_ISINDATABASE';
export const UPDATE_DATABASE_MODEL_OBJECT = 'UPDATE_DATABASE_MODEL_OBJECT';

export interface UpdateIsInDatabase {
    type: typeof UPDATE_ISINDATABASE;
    payload: boolean;
}


export interface UpdateDatabaseModelObject {
    type: typeof UPDATE_DATABASE_MODEL_OBJECT;
    payload: object;
}

export type DatabaseActionTypes = UpdateIsInDatabase | UpdateDatabaseModelObject;