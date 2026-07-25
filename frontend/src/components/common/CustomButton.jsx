import { Button } from "@mui/material";

function CustomButton({
  children,
  fullWidth = true,
  type = "button",
  onClick,
  loading = false,
}) {
  return (
    <Button
      type={type}
      fullWidth={fullWidth}
      variant="contained"
      onClick={onClick}
      disabled={loading}
      sx={{
        py: 1.5,
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: 600,
        background: "linear-gradient(90deg,#8E44AD,#FF6B9A)",
        "&:hover": {
          background: "linear-gradient(90deg,#7D3C98,#F06292)",
        },
      }}
    >
      {loading ? "Please wait..." : children}
    </Button>
  );
}

export default CustomButton;