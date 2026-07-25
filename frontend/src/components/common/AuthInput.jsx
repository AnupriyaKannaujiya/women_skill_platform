import { TextField } from "@mui/material";

function CustomInput(props) {
  return (
    <TextField
      fullWidth
      margin="normal"
      variant="outlined"
      error={!!props.error}
      helperText={props.error}
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "14px",
          color: "#fff",

          "& fieldset": {
            borderColor: "rgba(255,255,255,0.4)",
          },

          "&:hover fieldset": {
            borderColor: "#fff",
          },

          "&.Mui-focused fieldset": {
            borderColor: "#fff",
            borderWidth: "2px",
          },
        },

        "& .MuiInputLabel-root": {
          color: "rgba(255,255,255,0.8)",
        },

        "& .MuiInputLabel-root.Mui-focused": {
          color: "#fff",
        },

        "& .MuiOutlinedInput-input": {
          color: "#fff",
        },
        ...(props.sx || {}),
      }}
    />
  );
}

export default CustomInput;
