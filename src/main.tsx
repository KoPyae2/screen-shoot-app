import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./store/themeStore"; // applies persisted/system theme before first paint
import "./i18n/i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
