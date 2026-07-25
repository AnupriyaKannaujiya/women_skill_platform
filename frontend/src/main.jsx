import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { CssBaseline } from "@mui/material";
import {ThemeProvider} from "@mui/material/styles";

import "@fontsource/poppins"
import "react-toastify/dist/ReactToastify.css";

import theme from "./styles/theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
    <BrowserRouter>
      <CssBaseline />
      <App />
    </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);