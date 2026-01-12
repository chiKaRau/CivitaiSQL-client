export type OfflineWindowTheme = {
    headerBackgroundColor: string;
    headerFontColor: string;
    rowBackgroundColor: string;
    rowFontColor: string;
    evenRowBackgroundColor: string;
    oddRowBackgroundColor: string;
    gridBackgroundColor: string;
};

export const darkTheme: OfflineWindowTheme = {
    headerBackgroundColor: "#333",
    headerFontColor: "#fff",
    rowBackgroundColor: "#444",
    rowFontColor: "#fff",
    evenRowBackgroundColor: "#555",
    oddRowBackgroundColor: "#444",
    gridBackgroundColor: "#2b2b2b",
};

export const lightTheme: OfflineWindowTheme = {
    headerBackgroundColor: "#f0f0f0",
    headerFontColor: "#000",
    rowBackgroundColor: "#fff",
    rowFontColor: "#000",
    evenRowBackgroundColor: "#fafafa",
    oddRowBackgroundColor: "#fff",
    gridBackgroundColor: "#ffffff",
};
