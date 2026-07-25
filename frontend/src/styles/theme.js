import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#8E44AD",
    },
    secondary: {
      main: "#FF6B9A",
    },
    background: {
      default: "#F8F9FC",
      paper: "#FFFFFF",
    },
  },

  typography: {
    fontFamily: "'Poppins', sans-serif",

    h3: {
      fontWeight: 700,
    },

    h4: {
      fontWeight: 700,
    },

    h5: {
      fontWeight: 600,
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 14,
  },
});

export default theme;