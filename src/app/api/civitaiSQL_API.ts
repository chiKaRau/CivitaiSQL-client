import axios from "axios"
import config from "../config/config.json"
import { setError, clearError } from '../store/actions/errorsActions';

// --- Types ---
export interface TopTagsRequest {
    page: number;  // 0-based
    size: number;
    source: 'all' | 'tags' | 'fileName' | 'titles';
    exclude?: string[];
    minLen?: number;
    allowNumbers?: boolean;
    search?: string;
    op?: 'contains' | 'does not contain' | 'equals' | 'does not equal' | 'begins with' | 'ends with';
}

export interface TagCountDTO {
    tag: string;
    count: number;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    pageNumber?: number;
    pageSize?: number;
}

export const fetchVerifyConnectingDatabase = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/verify-connecting-database`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.success
        } else {
            // Handle the case when response is false
            throw new Error("Failed Connecting to Database");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


//dispatch cannot be used inside the functional components or custoom hook, async function is not allowed.
export const fetchCivitaiModelInfoFromCivitaiByModelID = async (modelID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-civitaiModel-info-by-modelID`, { modelID: modelID });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            return responseData.payload.model;
        } else {
            // Handle the case when success is false
            throw new Error("Retriving Civitai model info from Civitai failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

//dispatch cannot be used inside the functional components or custoom hook, async function is not allowed.
export const fetchFullRecordFromAllTableModelIDandVersionID = async (modelID: string, versionID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const { data, status } = await axios.post(
            `${config.domain}/api/find-full-record-from-all-tables-by-modelID-and-version`,
            { modelID, versionID }
        );
        if (status >= 200 && status < 300) return data?.payload ?? null;
        return null;
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

//dispatch cannot be used inside the functional components or custoom hook, async function is not allowed.
export const fetchCivitaiModelInfoFromCivitaiByVersionID = async (versionID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-civitaiModel-info-by-versionID`, { versionID: versionID });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            return responseData.payload.model;
        } else {
            // Handle the case when success is false
            throw new Error("Retriving Civitai model info from Civitai failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseModelInfoByModelID = async (modelID: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-modelID`, { modelID: modelID });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseRelatedModelsByName = async (name: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-name`, { name: name });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseRelatedModelsByTagsList = async (tagsList: string[], dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-list-of-models-dto-from-all-table-by-tagsList`, { tagsList });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDatabaseLatestAddedModelsPanel = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/find-latest-three-models-dto-from-all-tables`);
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.modelsList;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving latest model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchAddRecordToDatabase = async (selectedCategory: string, url: string, downloadFilePath: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/create-record-to-all-tables`,
            { category: selectedCategory, url: url, downloadFilePath: downloadFilePath });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed adding record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchAddRecordToDatabaseInCustom = async (modelsDTO: any): Promise<void> => {
    const response = await axios.post(
        `${config.domain}/api/create-record-to-all-tables-in-custom`,
        modelsDTO
    );

    // non-2xx or backend success=false
    if (response.status < 200 || response.status >= 300 || !response.data.success) {
        // include server message if available
        throw new Error(response.data.message || 'Failed adding record into Database.');
    }
};

export const fetchRemoveRecordFromDatabaseByID = async (id: number, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/delete-record-to-all-tables`,
            { id: id });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed removing record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed removing record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchUpdateRecordAtDatabase = async (id: number, url: string, selectedCategory: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/update-record-to-all-tables`,
            { id: id, url: url, category: selectedCategory });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed updating record into Database.");
        }

        if (!responseData.success) {
            // Handle the case when success is false
            throw new Error("Failed updating record into Database.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchUpdateCreatorUrlList = async (creatorUrl: string, status: string,
    lastChecked: boolean, selectedRating: string, dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/update_creator_url_list`,
            { creatorUrl, status, lastChecked, rating: selectedRating });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            return { status: "failure" }
            throw new Error("Failed updating record into Database.");
        }

        if (!responseData.success) {
            return { status: "failure" }
            // Handle the case when success is false
            throw new Error("Failed updating record into Database.");
        }

        return { status: "success" }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchRemoveFromCreatorUrlList = async (creatorUrl: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/remove_from_creator_url_list`,
            { creatorUrl });

        const responseData = response.data;

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            return { status: "failure" }
            throw new Error("Failed updating record into Database.");
        }

        if (!responseData.success) {
            return { status: "failure" }
            // Handle the case when success is false
            throw new Error("Failed updating record into Database.");
        }

        return { status: "success" }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchGetCategoriesList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get-categories-list`);
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.categoriesList;
            }
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Categories List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetFoldersList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get_folders_list`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.foldersList;
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Folders List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetPendingRemoveTagsList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get_pending_remove_tags_list`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.pendingRemoveTagsList;
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Pending Remove Tags List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetCreatorUrlList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get_creator_url_list`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.creatorUrlList;
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Creator Url List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchAddPendingRemoveTag = async (pendingRemoveTag: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/add_pending_remove_tag`, {
            pendingRemoveTag: pendingRemoveTag
        });
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed opening download directory.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetErrorModelList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/get_error_model_list`);
        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.errorModelList;
        } else {
            // Handle the case when response is false
            throw new Error("Retriving Error model List failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetTagsList = async (dispatch: any, selectedPrefix: string) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        // Construct the URL with the prefix as a query parameter if it's provided
        let url = `${config.domain}/api/get_tags_list`;
        if (selectedPrefix) {
            // Encode the prefix to handle special characters
            const encodedPrefix = encodeURIComponent(selectedPrefix);
            url += `?prefix=${encodedPrefix}`;
        }

        const response = await axios.get(url);

        if (response.status >= 200 && response.status < 300) {
            const { topTags, recentTags } = response.data.payload;

            // Return both topTags and recentTags
            return { topTags, recentTags };
        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving Tags List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Tags List retrieval:", error.message);
        // Dispatch the error to the state
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchGetCategoriesPrefixsList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        const response = await axios.get(`${config.domain}/api/get_categories_prefix_list`);

        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.categoriesPrefixsList;
        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving Categories Prefixs List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Categories Prefixs List retrieval:", error.message);
        // Dispatch the error to the state
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchGetFilePathCategoriesList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        const response = await axios.get(`${config.domain}/api/get_filePath_categories_list`);

        if (response.status >= 200 && response.status < 300) {
            return response.data.payload.filePathCategoriesList;

        } else {
            // Handle the case when response status is not successful
            throw new Error("Retrieving FilePath Categories List from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during FilePath Categories List retrieval:", error.message);
        // Dispatch the error to the state
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchOpenDownloadDirectory = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.get(`${config.domain}/api/open-download-directory`);
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed opening download directory.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchAppendToMustAddList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/append-to-must-add-list`, {
            url: url
        });
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed opening download directory.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByServer = async (url: string, name: string,
    modelID: string, versionID: string, downloadFilePath: string,
    filesList: { name: string; downloadUrl: string }[], dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-server`, {
            url: url, name: name,
            modelID: modelID, versionID: versionID,
            downloadFilePath: downloadFilePath,
            filesList: filesList
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed download files by server.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByServer_v2 = async (
    modelObject: {
        downloadFilePath: string, civitaiFileName: string, civitaiModelID: string,
        civitaiVersionID: string, civitaiModelFileList: { name: string; downloadUrl: string }[], civitaiUrl: string,
    }
    , dispatch: any) => {


    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-server-v2`, {
            modelObject
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            return false;
            throw new Error("Failed download files by server.");
        } else {
            return true;
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByServer_v2ForCustom = async (
    modelObject: {
        downloadFilePath: string;
        civitaiFileName: string;
        civitaiUrl: string;
        civitaiModelID: string;
        civitaiVersionID: string;
        baseModel: string;
        downloadUrl: string;
        imageUrls: string[];
    }
): Promise<boolean> => {
    const response = await axios.post(
        `${config.domain}/api/download-file-server-v2-for-custom`,
        { modelObject }
    );

    if (response.status >= 200 && response.status < 300 && response.data?.success) {
        return true;
    }
    throw new Error(response.data?.message || 'Failed to download files by server.');
};

export const fetchOfflineDownloadList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());

        // Make the GET request to the backend
        const response = await axios.get(`${config.domain}/api/get_offline_download_list`);

        // Check if the response status is in the 2xx range
        if (response.status >= 200 && response.status < 300) {
            const responseData = response.data;
            return responseData?.payload?.offlineDownloadList;
        } else {
            // Handle unexpected HTTP status codes
            throw new Error('Unexpected response status: ' + response.status);
        }

    } catch (error: any) {
        // Log the error to the console
        console.error("Error during offline download list retrieval:", error.message);

        // Dispatch the error to the Redux store
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
};

export const fetchTopTagsPage = async (
    dispatch: any,
    body: TopTagsRequest
): Promise<PageResponse<TagCountDTO>> => {
    try {
        const url = `${config.domain}/api/get-top-tags`; // matches your Postman examples
        const response = await axios.post(url, body);

        if (response.status >= 200 && response.status < 300) {
            // assuming your server wraps payload like { payload: PageResponse<TagCountDTO> }
            return response.data?.payload as PageResponse<TagCountDTO>;
        }
        throw new Error('Unexpected response status: ' + response.status);
    } catch (err: any) {
        console.error('fetchTopTagsPage error:', err?.message || err);
        throw err;
    }
};

/**
 * Fetch one page of the offline download list.
 * - `page0` is 0-based (backend expects 0-based).
 * - `size` is your page size.
 * - `filterEmptyBaseModel` keeps parity with your backend flag (default false).
 *
 * Returns the server payload directly:
 * {
 *   content: OfflineDownloadEntry[] (same shape you already use),
 *   page: number,
 *   size: number,
 *   totalElements: number,
 *   totalPages: number,
 *   hasNext: boolean,
 *   hasPrevious: boolean
 * }
 */
// civitaiSQL_api.ts
export const fetchOfflineDownloadListPage = async (
    dispatch: any,
    page: number,
    size: number,
    filterEmptyBaseModel: boolean = false,
    prefixes?: string[],
    search?: string,
    op?: 'contains' | 'does not contain' | 'equals' | 'does not equal' | 'begins with' | 'ends with',
    status?: 'pending' | 'non-pending' | 'both' // <- NEW
) => {
    try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(size));
        params.set('filterEmptyBaseModel', String(filterEmptyBaseModel));

        if (Array.isArray(prefixes)) {
            if (prefixes.length === 0) {
                params.append('prefix', '__NONE__');
            } else {
                prefixes.forEach(p => params.append('prefix', p));
            }
        }

        if (search && search.trim().length > 0) {
            params.set('search', search.trim());
        }
        if (op) {
            params.set('op', op);
        }
        if (status) {
            params.set('status', status); // "pending" | "non-pending" | "both"
        }

        const url = `${config.domain}/api/get_offline_download_list-in-page?${params.toString()}`;
        const response = await axios.get(url);

        if (response.status >= 200 && response.status < 300) {
            return response.data?.payload;
        }
        throw new Error('Unexpected response status: ' + response.status);
    } catch (error: any) {
        console.error('Paged fetch error:', error.message);
        throw error;
    }
};


/**
 * Calls the backend API to backup the offline_download_list.json file.
 *
 * @param dispatch - Redux dispatch function to handle state changes.
 */
export const fetchBackupOfflineDownloadList = async (dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        console.log("Starting backup of offline_download_list.json");

        // Make the POST request to the backup endpoint
        const response = await axios.post(`${config.domain}/api/backup_offline_download_list`);
        const responseData = response.data;
        if (response.status >= 200 && response.status < 300) {
            return responseData?.payload?.isBackedUp;
        } else {
            // Handle unexpected HTTP status codes
            return false
        }

    } catch (error: any) {
        // Handle errors (network issues, server errors, etc.)
        console.error("Error during backup operation:", error.message);
        // Dispatch an error state with the error message
        dispatch(setError({ hasError: true, errorMessage: error.message }));
        return false;
    }
};

export const fetchAddOfflineDownloadFileIntoOfflineDownloadList = async (
    modelObject: {
        downloadFilePath: string, civitaiFileName: string, civitaiModelID: string,
        civitaiVersionID: string, civitaiModelFileList: { name: string; downloadUrl: string }[], civitaiUrl: string, selectedCategory: string, civitaiTags: string[]
    }, isModifyMode: boolean
    , dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        console.log("ABC")
        console.log(modelObject)
        console.log(isModifyMode)
        const response = await axios.post(`${config.domain}/api/add-offline-download-file-into-offline-download-list`, {
            modelObject, isModifyMode
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding offline download file into offline download list by server.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchRemoveOfflineDownloadFileIntoOfflineDownloadList = async (
    modelObject: {
        civitaiModelID: string,
        civitaiVersionID: string
    }
    , dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/remove-offline-download-file-into-offline-download-list`, {
            modelObject
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding offline download file into offline download list by server.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchUpdateHoldFromOfflineDownloadList = async (
    modelObject: { civitaiModelID: string; civitaiVersionID: string },
    hold: boolean,
    dispatch: any
) => {
    try {
        dispatch(clearError());

        const response = await axios.post(
            `${config.domain}/api/update-hold-from-offline-download_list`,
            {
                modelNumber: modelObject.civitaiModelID,
                versionNumber: modelObject.civitaiVersionID,
                hold,
            }
        );

        if (!(response.status >= 200 && response.status < 300)) {
            throw new Error("Failed to update 'hold' for offline download record.");
        }
    } catch (error: any) {
        console.error("Error updating hold:", error?.message);
        dispatch(setError({ hasError: true, errorMessage: error?.message || "Unknown error" }));
    }
};

export const fetchUpdateDownloadPriorityFromOfflineDownloadList = async (
    modelObject: { civitaiModelID: string; civitaiVersionID: string },
    downloadPriority: number,
    dispatch: any
) => {
    try {
        dispatch(clearError());

        const response = await axios.post(
            `${config.domain}/api/update-download-priority-from-offline-download_list`,
            {
                modelNumber: modelObject.civitaiModelID,
                versionNumber: modelObject.civitaiVersionID,
                downloadPriority,
            }
        );

        if (!(response.status >= 200 && response.status < 300)) {
            throw new Error("Failed to update 'downloadPriority' for offline download record.");
        }
    } catch (error: any) {
        console.error("Error updating download priority:", error?.message);
        dispatch(setError({ hasError: true, errorMessage: error?.message || "Unknown error" }));
    }
};

export const fetchRemoveFromErrorModelList = async (
    modelObject: {
        civitaiModelID: string,
        civitaiVersionID: string
    }
    , dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/remove-from-error-model-list`, {
            modelObject
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed adding offline download file into offline download list by server.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}


export const fetchDownloadFilesByBrowser = async (url: string, downloadFilePath: string, dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-browser`, {
            url: url, downloadFilePath: downloadFilePath,
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed download files by browser.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchDownloadFilesByBrowser_v2 = async (url: string, downloadFilePath: string, dispatch: any) => {

    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/download-file-browser`, {
            url: url, downloadFilePath: downloadFilePath,
        });

        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed download files by browser.");
        }

    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckCartList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-cart-list`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.isCarted;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckIfUrlExistInDatabase = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-if-url-exist-in-database`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.isSaved;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchFindVersionNumbersForOfflineDownloadList = async (modelNumber: string, versionNumbers: string[], dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-version-numbers-for-offlinedownloadlist-tampermonkey`, { modelNumber, versionNumbers });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                const existedOfflineVersions = responseData.payload.existedVersionsList || [];
                // Convert each version to string
                const versionSet = new Set(existedOfflineVersions.map(String));
                return versionSet;
            } else {
                return new Set();
            }
        } else {
            throw new Error("Retrieving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckQuantityOfOfflinedownloadList = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-offlinedownload-list`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchOpenModelDownloadDirectory = async (modelDownloadPath: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/open-model-download-directory`, { modelDownloadPath: modelDownloadPath });
        if (!(response.status >= 200 && response.status < 300)) {
            // Handle the case when response is false
            throw new Error("Failed opening download directory.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckQuantityofUrlinDatabaseByUrl = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-url-in-database-by-url`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckQuantityofUrlinDatabaseByModelID = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-quantity-of-url-in-database-by-modelID`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return responseData.payload.quantity;
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchCheckIfModelUpdateAvaliable = async (url: string, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/check-if-model-update-avaliable`, { url: url });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return { isUpdateAvaliable: responseData.payload.isUpdateAvaliable, isEarlyAccess: responseData.payload.isEarlyAccess };
            } else {
                // Handle the case when success is false
                throw new Error("Retriving related model info from Database failed.");
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchFindVersionNumbersForModel = async (modelId: string, versionIds: any, dispatch: any) => {
    try {
        // Clear any previous errors
        dispatch(clearError());
        const response = await axios.post(`${config.domain}/api/find-version-numbers-for-model`, {
            modelNumber: modelId,
            versionNumbers: versionIds
        });
        const responseData = response.data;

        if (response.status >= 200 && response.status < 300) {
            if (responseData.success) {
                return new Set(response.data.payload.existedVersionsList.map(String));
            } else {

                if ("No models found with the given model number" !== responseData.message) {

                    // Handle the case when success is false
                    throw new Error("Retriving related model info from Database failed.");
                }
            }
        } else {
            // Handle the case when success is false
            throw new Error("Retriving related model info from Database failed.");
        }
    } catch (error: any) {
        // Handle other types of errors, e.g., network issues
        console.error("Error during Civitai Info retrieval:", error.message);
        // Optionally, you can throw an error or return a specific value
        dispatch(setError({ hasError: true, errorMessage: error.message }));
    }
}

export const fetchUpdateFullRecord = async (dispatch: any, dto: any) => {
    try {
        // Clear previous errors
        dispatch(clearError());

        // Basic guard (backend will also validate)
        if (!dto?.model?.modelNumber || !dto?.model?.versionNumber) {
            throw new Error("model.modelNumber and model.versionNumber are required");
        }

        const response = await axios.put(
            `${config.domain}/api/update-full-record-by-modelID-and-version`,
            dto,
            { headers: { "Content-Type": "application/json" } }
        );

        if (response.status >= 200 && response.status < 300) {
            // Backend uses CustomResponse; updated record is in payload
            return response.data?.payload;
        } else {
            throw new Error("Unexpected response status: " + response.status);
        }
    } catch (error: any) {
        console.error("Error during full record update:", error?.message || error);
        dispatch(setError({ hasError: true, errorMessage: error?.message || String(error) }));
    }
};
