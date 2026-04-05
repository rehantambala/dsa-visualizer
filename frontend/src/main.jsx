/**
 * frontend/src/main.jsx
 *
 * What this file is for:
 * - React entry point for the DSA Visualizer frontend.
 *
 * What it connects to:
 * - Loads the main App component from ./App.jsx
 * - Loads the global stylesheet from ./index.css
 *
 * What it displays:
 * - The full DSA Visualizer application mounted into the root element.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);