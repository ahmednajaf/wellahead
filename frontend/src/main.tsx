import React from "react";
import { createRoot } from "react-dom/client";
import App from "./combined/App";
import "./styles/tokens.css";
import "./styles/app.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import "./styles/references.css";

import "./combined/combined.css";
