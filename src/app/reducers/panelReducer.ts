import { PanelActionTypes } from '../constants/PanelActionTypes';

interface PanelState {
    panels: Record<string, boolean>;
}

const initialState: PanelState = {
    panels: {},
};

const panelReducer = (state = initialState, action: PanelActionTypes): PanelState => {
    switch (action.type) {
        case 'TOGGLE_PANEL': {
            const { panelId } = action.payload;
            return {
                ...state,
                panels: {
                    ...state.panels,
                    [panelId]: !state.panels[panelId],
                },
            };
        }
        default:
            return state;
    }
};

export default panelReducer;
export type { PanelState }; // Export UserState type for reuse
