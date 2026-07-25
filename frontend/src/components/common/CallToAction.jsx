import {
  Box,
  Button,
  Container,
  Typography,
} from "@mui/material";

function CallToAction() {
  return (
    <Box
      sx={{
        py: 8,
        bgcolor: "primary.main",
        color: "white",
        textAlign: "center",
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
        >
          Are You a Skilled Woman?
        </Typography>

        <Typography sx={{ mb: 3 }}>
          Join our platform and connect with customers near you.
        </Typography>

        <Button
          variant="contained"
          color="secondary"
          size="large"
        >
          Become a Provider
        </Button>
      </Container>
    </Box>
  );
}

export default CallToAction;