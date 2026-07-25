import {
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from "@mui/material";

const testimonials = [
  {
    name: "Riya",
    review:
      "I found an excellent Mehndi artist through this platform. Very satisfied!",
  },
  {
    name: "Pooja",
    review:
      "Booking was simple and the provider was professional and punctual.",
  },
  {
    name: "Sneha",
    review:
      "A great initiative to support skilled women in our community.",
  },
];

function Testimonials() {
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          textAlign="center"
          fontWeight="bold"
          mb={5}
        >
          What Our Users Say
        </Typography>

        <Grid container spacing={3}>
          {testimonials.map((item) => (
            <Grid key={item.name} size={{ xs: 12, md: 4 }}>
              <Card sx={{ p: 3, height: "100%" }}>
                <Avatar sx={{ mb: 2 }}>
                  {item.name[0]}
                </Avatar>

                <CardContent>
                  <Typography gutterBottom fontWeight="bold">
                    {item.name}
                  </Typography>

                  <Typography color="text.secondary">
                    {item.review}
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

export default Testimonials;