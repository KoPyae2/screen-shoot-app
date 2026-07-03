import React from "react";
import ReactDOM from "react-dom/client";
import { RegionOverlay } from "./components/overlay/RegionOverlay";

ReactDOM.createRoot(document.getElementById("overlay-root") as HTMLElement).render(
  <React.StrictMode>
    <RegionOverlay />
  </React.StrictMode>,
);
