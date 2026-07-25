import { Box, Card, CardContent, Container, Grid, Typography } from "@mui/material";

const categories = [
  "Mehndi Artist",
  "Tailoring",
  "Beautician",
  "Cooking",
  "Home Tuition",
  "Dance Teacher",
  "Makeup Artist",
  "Handicraft",
];

function CategoriesSection() {
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">

        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          mb={4}
        >
          Popular Categories
        </Typography>

        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid key={category} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  textAlign: "center",
                  py: 4,
                  cursor: "pointer",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-5px)",
                  },
                }}
              >
                <CardContent>
                  <Typography variant="h6">
                    {category}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

      </Container>
    </Box>
  );
}

export default CategoriesSection;