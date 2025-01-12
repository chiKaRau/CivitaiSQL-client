import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import WindowComponent from './app/components/window/WindowComponent';

//Stores
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './app/store/configureStore';
import { AppState } from './app/store/configureStore';

//library Components
import 'bootstrap/dist/css/bootstrap.min.css';
//css
import '../src/css/styles.css'; // Import the CSS file
import OfflineWindow from "./app/components/window_offline/OfflineWindow";

const root = createRoot(document.getElementById("root")!);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <OfflineWindow />
        </Provider>
    </React.StrictMode>
);