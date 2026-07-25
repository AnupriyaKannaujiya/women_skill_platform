import { FormControl, InputLabel, Select } from "@mui/material";

function CustomSelect(props) {
  return (
    <FormControl
      fullWidth
      margin="normal"
      sx={{
        "& .MuiOutlinedInput-root": {
          color: "white",

          "& fieldset": {
            borderColor: "rgba(255,255,255,0.3)",
          },

          "&:hover fieldset": {
            borderColor: "white",
          },

          "&.Mui-focused fieldset": {
            borderColor: "white",
          },
        },
      }}
    >
      <Select displayEmpty {...props} />
    </FormControl>
  );
}

export default CustomSelect;
