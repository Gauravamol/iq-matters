import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PlatformProvider } from "./context/PlatformContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <PlatformProvider>
        <App />
      </PlatformProvider>
    </AuthProvider>
  </React.StrictMode>
);
