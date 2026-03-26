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

    buttonHoverBackground: string;
    buttonHoverText: string;
    buttonHoverBorder: string;
    buttonHoverShadow: string;

    buttonActiveBackground: string;
    buttonActiveText: string;
    buttonActiveBorder: string;
    buttonActiveShadow: string;

    buttonDisabledBackground: string;
    buttonDisabledText: string;
    buttonDisabledBorder: string;
    buttonDisabledOpacity: number;

    focusRing: string;
    controlTransition: string;

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
    panelBackground: "#333333",
    panelBorder: "#555555",
    panelText: "#ffffff",
    subText: "#cccccc",

    buttonBackground: "#444444",
    buttonText: "#ffffff",
    buttonBorder: "#5b5b5b",
    buttonShadow: "0 6px 18px rgba(0,0,0,0.35)",

    buttonHoverBackground: "#505050",
    buttonHoverText: "#ffffff",
    buttonHoverBorder: "#7a7a7a",
    buttonHoverShadow: "0 8px 20px rgba(0,0,0,0.42)",

    buttonActiveBackground: "#3d3d3d",
    buttonActiveText: "#ffffff",
    buttonActiveBorder: "#8b8b8b",
    buttonActiveShadow: "inset 0 1px 2px rgba(0,0,0,0.35)",

    buttonDisabledBackground: "#3b3b3b",
    buttonDisabledText: "#9a9a9a",
    buttonDisabledBorder: "#4c4c4c",
    buttonDisabledOpacity: 0.65,

    focusRing: "rgba(96,165,250,0.45)",
    controlTransition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease, transform 100ms ease",

    headerBackgroundColor: "#333333",
    headerFontColor: "#ffffff",
    rowBackgroundColor: "#444444",
    rowFontColor: "#ffffff",
    evenRowBackgroundColor: "#555555",
    oddRowBackgroundColor: "#444444",
    gridBackgroundColor: "#2b2b2b",
};

export const lightTheme: AppTheme = {
    pageBackground: "#ffffff",
    panelBackground: "#f0f0f0",
    panelBorder: "#d1d5db",
    panelText: "#111111",
    subText: "#444444",

    buttonBackground: "#ffffff",
    buttonText: "#111111",
    buttonBorder: "#d1d5db",
    buttonShadow: "0 6px 18px rgba(0,0,0,0.10)",

    buttonHoverBackground: "#f9fafb",
    buttonHoverText: "#111111",
    buttonHoverBorder: "#9ca3af",
    buttonHoverShadow: "0 8px 20px rgba(0,0,0,0.14)",

    buttonActiveBackground: "#eceff3",
    buttonActiveText: "#111111",
    buttonActiveBorder: "#6b7280",
    buttonActiveShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",

    buttonDisabledBackground: "#f3f4f6",
    buttonDisabledText: "#9ca3af",
    buttonDisabledBorder: "#e5e7eb",
    buttonDisabledOpacity: 0.7,

    focusRing: "rgba(59,130,246,0.30)",
    controlTransition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease, transform 100ms ease",

    headerBackgroundColor: "#f0f0f0",
    headerFontColor: "#000000",
    rowBackgroundColor: "#ffffff",
    rowFontColor: "#000000",
    evenRowBackgroundColor: "#fafafa",
    oddRowBackgroundColor: "#ffffff",
    gridBackgroundColor: "#ffffff",
};

export type ButtonVisualState = "default" | "hover" | "active" | "disabled" | "focus";

export const getThemedButtonStateStyle = (
    theme: AppTheme,
    state: ButtonVisualState = "default"
): CSSProperties => {
    switch (state) {
        case "hover":
            return {
                backgroundColor: theme.buttonHoverBackground,
                color: theme.buttonHoverText,
                border: `1px solid ${theme.buttonHoverBorder}`,
                boxShadow: theme.buttonHoverShadow,
                transform: "translateY(-1px)",
            };

        case "active":
            return {
                backgroundColor: theme.buttonActiveBackground,
                color: theme.buttonActiveText,
                border: `1px solid ${theme.buttonActiveBorder}`,
                boxShadow: theme.buttonActiveShadow,
                transform: "translateY(0)",
            };

        case "focus":
            return {
                boxShadow: `${theme.buttonShadow}, 0 0 0 3px ${theme.focusRing}`,
            };

        case "disabled":
            return {
                backgroundColor: theme.buttonDisabledBackground,
                color: theme.buttonDisabledText,
                border: `1px solid ${theme.buttonDisabledBorder}`,
                opacity: theme.buttonDisabledOpacity,
                cursor: "not-allowed",
                boxShadow: "none",
                transform: "none",
            };

        default:
            return {
                backgroundColor: theme.buttonBackground,
                color: theme.buttonText,
                border: `1px solid ${theme.buttonBorder}`,
                boxShadow: theme.buttonShadow,
                transform: "translateY(0)",
            };
    }
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
        transition: theme.controlTransition,
        outline: "none",
    },

    themedDropdownToggleStyle: {
        ...getThemedButtonStateStyle(theme, "default"),
        transition: theme.controlTransition,
        cursor: "pointer",
        userSelect: "none",
        outline: "none",
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
        ...getThemedButtonStateStyle(theme, "default"),
        transition: theme.controlTransition,
        cursor: "pointer",
        userSelect: "none",
        outline: "none",
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

export const getShortcutPanelStyles = (
    theme: AppTheme,
    isDarkMode: boolean,
    shared: OfflineWindowStyles
) => ({
    panel: {
        ...shared.themedPanelStyle,
        position: 'relative' as const,
        padding: '8px',
        width: '100%',
        flex: 1,
        minWidth: 0,
        borderRadius: '10px',
    },

    select: {
        ...shared.themedSelectStyle,
        padding: '6px 8px',
        fontSize: '13px',
        borderRadius: '8px',
        maxWidth: '520px',
    },

    popupPanel: {
        ...shared.themedPanelStyle,
        position: 'absolute' as const,
        top: '110%',
        left: 0,
        padding: '6px',
        zIndex: 9999,
        borderRadius: '10px',
    },

    iconBtn: {
        ...shared.themedButtonStyle,
        width: 30,
        height: 30,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        padding: 0,
        cursor: 'pointer',
    },

    subtleBox: {
        ...shared.themedSubtlePanelStyle,
        padding: '6px 8px',
    },

    label: {
        color: theme.subText,
        fontSize: '12px',
        whiteSpace: 'nowrap' as const,
    },

    divider: {
        width: '100%',
        height: '1px',
        background: theme.panelBorder,
        margin: '8px 0',
    },

    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        border: `1px solid ${theme.panelBorder}`,
        background: theme.rowBackgroundColor,
        color: theme.panelText,
        whiteSpace: 'nowrap' as const,
    },

    pillBlue: {
        border: `1px solid ${isDarkMode ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.30)'}`,
        background: isDarkMode ? 'rgba(96,165,250,0.14)' : 'rgba(59,130,246,0.10)',
    },

    pillRed: {
        border: `1px solid ${isDarkMode ? 'rgba(248,113,113,0.45)' : 'rgba(220,38,38,0.30)'}`,
        background: isDarkMode ? 'rgba(248,113,113,0.14)' : 'rgba(220,38,38,0.10)',
    },

    compactGroup: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        borderRadius: '999px',
        border: `1px solid ${theme.panelBorder}`,
        background: theme.rowBackgroundColor,
    },

    topRow: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
    },

    topLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap' as const,
        justifyContent: 'flex-start',
        minWidth: 0,
    },

    topCenter: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },

    topRight: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '6px',
    },

    rowBetween: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap' as const,
        width: '100%',
    },

    rowLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },

    rowRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap' as const,
    },

    dropdownWrap: {
        position: 'relative' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flex: '1 1 auto',
        minWidth: '280px',
    },

    miniInput: {
        backgroundColor: theme.panelBackground,
        color: theme.panelText,
        border: `1px solid ${theme.panelBorder}`,
        width: '52px',
        height: '28px',
        padding: '2px 6px',
        fontSize: '12px',
        textAlign: 'center' as const,
        borderRadius: '6px',
    },

    longCenterBtn: {
        ...shared.themedButtonStyle,
        minWidth: '240px',
        height: '34px',
        padding: '0 18px',
        borderRadius: '10px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
    },

    lockedBadge: {
        ...shared.themedSubtlePanelStyle,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
    },
});