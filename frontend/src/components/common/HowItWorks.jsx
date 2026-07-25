import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from "@mui/material";

const steps = [
  {
    title: "Search",
    description: "Find skilled women professionals near your location.",
  },
  {
    title: "Book",
    description: "Send a booking request in just a few clicks.",
  },
  {
    title: "Get Service",
    description: "Connect with the provider and get quality service.",
  },
];

function HowItWorks() {
  return (
    <Box sx={{ py: 8, bgcolor: "#fafafa" }}>
      <Container maxWidth="lg">

        <Typography
          variant="h4"
          align="center"
          fontWeight="bold"
          mb={5}
        >
          How It Works
        </Typography>

        <Grid container spacing={3}>
          {steps.map((step, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Card sx={{ textAlign: "center", p: 3 }}>
                <CardContent>

                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary"
                    gutterBottom
                  >
                    {index + 1}
                  </Typography>

                  <Typography variant="h6" gutterBottom>
                    {step.title}
                  </Typography>

                  <Typography color="text.secondary">
                    {step.description}
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

export default HowItWorks;