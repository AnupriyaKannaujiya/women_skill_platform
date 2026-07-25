import { Box, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
      sx={{
        mt: 5,
        py: 2,
        textAlign: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Typography>
        © 2026 Women Skill Platform. All Rights Reserved.
      </Typography>
    </Box>
  );
}

export default Footer;