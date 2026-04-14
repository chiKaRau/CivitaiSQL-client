import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchCheckModelVersionFileExists } from "../api/civitaiSQL_api";

const useModelVersionFileExists = (
    modelID?: string,
    versionID?: string,
    refreshKey?: number | string
) => {
    const dispatch = useDispatch();

    const [exists, setExists] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const run = async () => {
            if (!modelID || !versionID) {
                if (isMounted) {
                    setExists(false);
                    setIsLoading(false);
                }
                return;
            }

            setIsLoading(true);

            try {
                const payload = await fetchCheckModelVersionFileExists(
                    dispatch,
                    modelID,
                    versionID
                );

                if (isMounted) {
                    setExists(!!payload?.exists);
                }
            } catch (error) {
                if (isMounted) {
                    setExists(false);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        run();

        return () => {
            isMounted = false;
        };
    }, [dispatch, modelID, versionID, refreshKey]);

    return {
        exists,
        isLoading,
    };
};

export default useModelVersionFileExists;