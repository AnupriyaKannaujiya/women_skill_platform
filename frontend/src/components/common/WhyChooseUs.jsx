import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from "@mui/material";

const features = [
  {
    title: "Verified Providers",
    description: "Connect with trusted and verified women professionals.",
  },
  {
    title: "Easy Booking",
    description: "Book services quickly with a simple booking process.",
  },
  {
    title: "Affordable Pricing",
    description: "Find skilled professionals within your budget.",
  },
  {
    title: "Local Services",
    description: "Search providers near your city and locality.",
  },
];

function WhyChooseUs() {
  return (
    <Box sx={{ py: 8, bgcolor: "#f9f9f9" }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          align="center"
          fontWeight="bold"
          mb={5}
        >
          Why Choose Us
        </Typography>

        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                  >
                    {feature.title}
                  </Typography>

                  <Typography color="text.secondary">
                    {feature.description}
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

export default WhyChooseUs;