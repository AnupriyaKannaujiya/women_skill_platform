import { TextField } from "@mui/material";

function CustomInput(props) {
  return (
    <TextField
      fullWidth
      margin="normal"
      variant="outlined"
      {...props}
    />
  );
}

export default CustomInput;