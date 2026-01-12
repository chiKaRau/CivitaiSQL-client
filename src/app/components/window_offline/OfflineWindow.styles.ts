import type { CSSProperties } from "react";

type OfflineWindowStyleArgs = {
    isDarkMode: boolean;
    currentTheme: { gridBackgroundColor: string };
    leftOverlayEntry: unknown; // change to your real type if you want
};


export const makeOfflineWindowStyles = ({
    isDarkMode,
    currentTheme,
    leftOverlayEntry,
}: OfflineWindowStyleArgs) => {

    const agGridStyle: React.CSSProperties = {
        height: '1000px',
        width: '100%',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        paddingBottom: '60px', // Space for the fixed pagination if needed
    };


    const filterContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    };

    const filterSelectStyle: React.CSSProperties = {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minWidth: '150px',
    };

    const downloadButtonStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: '#28a745',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '16px',
    };

    const downloadButtonDisabledStyle: React.CSSProperties = {
        ...downloadButtonStyle,
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
    };

    const controlRowStyle: React.CSSProperties = {
        marginTop: 8,
        paddingTop: 8,
        paddingBottom: 8,
        borderTop: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'nowrap',        // keep on a single line
    };

    const inlineIconBtnStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
        background: isDarkMode ? '#111' : '#fff',
        color: isDarkMode ? '#fff' : '#000',
        cursor: 'pointer',
    };

    const inlineDangerBtnStyle: React.CSSProperties = {
        ...inlineIconBtnStyle,
        border: `1px solid ${isDarkMode ? '#7f1d1d' : '#f5c2c7'}`,
        background: '#dc3545',
        color: '#fff',
    };

    // Inline styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',         // full viewport height
        overflowX: 'hidden',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: currentTheme.gridBackgroundColor,
        transition: 'background-color 0.3s ease',
    };

    const leftPanelStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        width: '500px',
        height: '100vh',
        overflowY: 'auto',      // <--- enable vertical scrolling if content is tall
        overflowX: 'hidden',
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderRight: isDarkMode ? '1px solid #777' : '1px solid #ccc',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box',
    };

    const leftPanelComputedStyle: React.CSSProperties = {
        ...leftPanelStyle,
        overflowY: leftOverlayEntry ? 'hidden' : leftPanelStyle.overflowY
    };

    const leftOverlayBackdropStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',  // dims ONLY the left panel
        display: 'flex',
        zIndex: 1100
    };

    const leftOverlayDrawerStyle: React.CSSProperties = {
        width: '95%',  // covers ~95% of the left panel
        height: '100%',
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        color: isDarkMode ? '#fff' : '#000',
        boxShadow: '2px 0 10px rgba(0,0,0,0.4)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: 14,
        position: 'relative',
        transform: 'translateX(0)',
        transition: 'transform 180ms ease'
    };

    const closeBtnStyle: React.CSSProperties = {
        position: 'absolute',
        top: 8, right: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
    };

    const previewBtnStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 34,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        border: `1px solid ${isDarkMode ? '#666' : '#ccc'}`,
        color: isDarkMode ? '#fff' : '#111',
        background: isDarkMode ? '#111' : '#fff',
        cursor: 'pointer',
        boxShadow: isDarkMode ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.2)'
    };

    const previewBtnActiveStyle: React.CSSProperties = {
        ...previewBtnStyle,
        background: '#2563eb',
        borderColor: isDarkMode ? '#60A5FA' : '#93c5fd',
        color: '#fff',
        boxShadow: isDarkMode ? '0 0 0 3px rgba(37,99,235,.35)' : '0 0 0 3px rgba(37,99,235,.2)'
    };


    const rightContentStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,                        // <- allow this flex child to get narrower than its contents
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        boxSizing: 'border-box',
        height: '100vh',
        overflowY: 'auto',                  // vertical scroll for tall content
        overflowX: 'auto',                  // horizontal scroll for wide content
    };

    const contentStyle: React.CSSProperties = {
        flex: 1, // Take up remaining space
        overflowY: 'auto', // Enable vertical scrolling
        paddingBottom: '60px', // Space for the fixed pagination
    };

    const footerStyle: React.CSSProperties = {
        backgroundColor: isDarkMode ? '#333' : '#f8f9fa',
        padding: '10px 20px',
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        width: '100%', // Ensures the footer spans the entire width of the right panel
        // Removed position: 'fixed', bottom: 0, left: 0
    };

    const headerStyleContainer: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column', // Change from default 'row' to 'column'
        alignItems: 'flex-start', // Align items to the start for better wrapping
        marginBottom: '20px',
    };


    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        marginTop: '10px',
        flexWrap: 'wrap', // Allow buttons to wrap to the next line
        width: '100%', // Ensure the button group takes full width for better wrapping
    };

    // Example Button Style Adjustments
    const responsiveButtonStyle: React.CSSProperties = {
        flex: '1 1 auto', // Allow buttons to grow and shrink as needed
        minWidth: '100px', // Set a minimum width to maintain readability
        padding: '8px 12px', // Adjust padding for better fit
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const badgeStyle: React.CSSProperties = {
        position: 'absolute',
        top: -6,
        right: -6,
        background: 'red',
        color: 'white',
        borderRadius: '999px',
        padding: '2px 6px',
        fontSize: '0.75rem',
        lineHeight: 1,
        zIndex: 1
    };


    return {
        agGridStyle,
        filterContainerStyle,
        filterSelectStyle,
        downloadButtonStyle,
        downloadButtonDisabledStyle,
        controlRowStyle,
        inlineIconBtnStyle,
        inlineDangerBtnStyle,
        containerStyle,
        leftPanelStyle,
        leftPanelComputedStyle,
        leftOverlayBackdropStyle,
        leftOverlayDrawerStyle,
        closeBtnStyle,
        previewBtnStyle,
        previewBtnActiveStyle,
        rightContentStyle,
        contentStyle,
        footerStyle,
        headerStyleContainer,
        buttonGroupStyle,
        responsiveButtonStyle,
        badgeStyle,
    };
};