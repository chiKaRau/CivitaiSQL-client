import { TOGGLE_PANEL } from '../constants/PanelActionTypes';

export const togglePanel = (panelId: string) => ({
    type: TOGGLE_PANEL,
    payload: { panelId },
});
