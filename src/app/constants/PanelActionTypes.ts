// Define action types
export const TOGGLE_PANEL = 'TOGGLE_PANEL';

export interface TogglePanelAction {
    type: typeof TOGGLE_PANEL;
    payload: { panelId: string };
}

export type PanelActionTypes = TogglePanelAction