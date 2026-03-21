import type { CSSProperties } from "react";

export type AppTheme = {
    pageBackground: string;
    panelBackground: string;
    panelBorder: string;
    panelText: string;
    subText: string;
    buttonBackground: string;
    buttonText: string;
    buttonBorder: string;
    buttonShadow: string;

    headerBackgroundColor: string;
    headerFontColor: string;
    rowBackgroundColor: string;
    rowFontColor: string;
    evenRowBackgroundColor: string;
    oddRowBackgroundColor: string;
    gridBackgroundColor: string;
};

export const darkTheme: AppTheme = {
    pageBackground: "#2b2b2b",
    panelBackground: "#333",
    panelBorder: "#555",
    panelText: "#fff",
    subText: "#ccc",
    buttonBackground: "#444",
    buttonText: "#fff",
    buttonBorder: "#555",
    buttonShadow: "0 6px 18px rgba(0,0,0,0.35)",

    headerBackgroundColor: "#333",
    headerFontColor: "#fff",
    rowBackgroundColor: "#444",
    rowFontColor: "#fff",
    evenRowBackgroundColor: "#555",
    oddRowBackgroundColor: "#444",
    gridBackgroundColor: "#2b2b2b",
};

export const lightTheme: AppTheme = {
    pageBackground: "#ffffff",
    panelBackground: "#f0f0f0",
    panelBorder: "#d1d5db",
    panelText: "#000",
    subText: "#444",
    buttonBackground: "#ffffff",
    buttonText: "#000",
    buttonBorder: "#d1d5db",
    buttonShadow: "0 6px 18px rgba(0,0,0,0.10)",

    headerBackgroundColor: "#f0f0f0",
    headerFontColor: "#000",
    rowBackgroundColor: "#fff",
    rowFontColor: "#000",
    evenRowBackgroundColor: "#fafafa",
    oddRowBackgroundColor: "#fff",
    gridBackgroundColor: "#ffffff",
};

export type OfflineWindowStyles = {
    themedSelectStyle: CSSProperties;
    themedDropdownToggleStyle: CSSProperties;
    themedDropdownMenuStyle: CSSProperties;
    themedCheckLabelStyle: CSSProperties;
    themedButtonStyle: CSSProperties;
    themedPanelStyle: CSSProperties;
    themedSubtlePanelStyle: CSSProperties;
    agGridThemeStyle: CSSProperties;
};

export const getOfflineWindowStyles = (
    theme: AppTheme,
    isDarkMode: boolean
): OfflineWindowStyles => ({
    themedSelectStyle: {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.buttonShadow,
    },

    themedDropdownToggleStyle: {
        backgroundColor: theme.buttonBackground,
        color: theme.buttonText,
        border: `1px solid ${theme.buttonBorder}`,
        boxShadow: theme.buttonShadow,
    },

    themedDropdownMenuStyle: {
        padding: 8,
        maxHeight: 240,
        overflowY: "auto",
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.buttonShadow,
    },

    themedCheckLabelStyle: {
        color: theme.panelText,
    },

    themedButtonStyle: {
        backgroundColor: theme.buttonBackground,
        color: theme.buttonText,
        border: `1px solid ${theme.buttonBorder}`,
        boxShadow: theme.buttonShadow,
    },

    themedPanelStyle: {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.buttonShadow,
        borderRadius: "12px",
    },

    themedSubtlePanelStyle: {
        backgroundColor: theme.rowBackgroundColor,
        color: theme.rowFontColor,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: "8px",
    },

    agGridThemeStyle: {
        height: 220,
        width: "100%",
        backgroundColor: theme.gridBackgroundColor,
        color: theme.rowFontColor,
        ["--ag-background-color" as any]: theme.gridBackgroundColor,
        ["--ag-foreground-color" as any]: theme.rowFontColor,
        ["--ag-header-background-color" as any]: theme.headerBackgroundColor,
        ["--ag-header-foreground-color" as any]: theme.headerFontColor,
        ["--ag-odd-row-background-color" as any]: theme.oddRowBackgroundColor,
        ["--ag-row-hover-color" as any]: isDarkMode ? "#3a3a3a" : "#f3f4f6",
        ["--ag-border-color" as any]: theme.panelBorder,
        ["--ag-secondary-border-color" as any]: theme.panelBorder,
        ["--ag-input-border-color" as any]: theme.panelBorder,
        ["--ag-selected-row-background-color" as any]: isDarkMode ? "#4a4a4a" : "#e5e7eb",
    },
});