export const retrieveCivitaiFileName = (civitaiData: any, civitaiVersionID: string) => {
    //modelVersionsIndex
    let modelVersionsIndex = civitaiData?.modelVersions.findIndex((version: any) => { return version.id == civitaiVersionID }) | 0;

    //fileIndex
    let fileIndex = 0
    if (civitaiData?.modelVersions[modelVersionsIndex]?.files.length > 1) {
        fileIndex = civitaiData?.modelVersions[modelVersionsIndex]?.files?.findIndex((obj: any) => obj.type === "Model");
    }

    return civitaiData?.modelVersions[modelVersionsIndex]?.files[fileIndex]?.name;
}

export const retrieveCivitaiFilesList = (civitaiData: any, civitaiVersionID: string) => {
    //modelVersionsIndex
    let modelVersionsIndex = civitaiData?.modelVersions.findIndex((version: any) => { return version.id == civitaiVersionID }) | 0;

    //fileIndex
    let fileIndex = 0
    if (civitaiData?.modelVersions[modelVersionsIndex]?.files.length > 1) {
        fileIndex = civitaiData?.modelVersions[modelVersionsIndex]?.files?.findIndex((obj: any) => obj.type === "Model");
    }

    return civitaiData?.modelVersions[modelVersionsIndex].files.
        map((element: any) => ({ name: element.name, downloadUrl: element.downloadUrl }));
} 