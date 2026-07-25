import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";

function HeroSection() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        bgcolor: "#fdf2f8",
        py: 10,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Empowering Women Through Skills
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Find trusted women professionals near you for Mehndi, Tailoring,
          Beauty Services, Cooking, Home Tuition and much more.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/providers")}
        >
          Explore Providers
        </Button>
      </Container>
    </Box>
  );
}

export default HeroSection;
