import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Rating,
  Typography,
} from "@mui/material";

function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);

  const fetchProvider = async () => {
    try {
      const response = await api.get(`/users/${id}`);

      console.log(response.data.user);

      setProvider(response.data.user);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReviews(response.data.reviews);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchProvider();
    fetchReviews();
  }, []);

  if (!provider) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Paper
        elevation={5}
        sx={{
          p: 4,
          borderRadius: 4,
        }}
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box textAlign="center">
              <Avatar
                src={
                  provider.photo ||
                  `https://ui-avatars.com/api/?name=${provider.name}`
                }
                sx={{
                  width: 170,
                  height: 170,
                  mx: "auto",
                  mb: 2,
                }}
              />

              <Typography variant="h4" fontWeight="bold">
                {provider.name}
              </Typography>

              <Typography color="text.secondary" mt={1}>
                {provider.city}
              </Typography>

              <Box mt={2}>
                <Rating value={provider.rating || 0} precision={0.5} readOnly />

                <Typography color="text.secondary">
                  ({provider.totalReviews} Reviews)
                </Typography>
              </Box>

              <Box
                mt={3}
                display="flex"
                justifyContent="center"
                gap={1}
                flexWrap="wrap"
              >
                {provider.skill?.map((item) => (
                  <Chip key={item} label={item} color="primary" />
                ))}
              </Box>

              <Button
                fullWidth
                variant="outlined"
                color="success"
                sx={{ mt: 4 }}
                href={`https://wa.me/91${provider.whatsapp}`}
                target="_blank"
              >
                Contact on WhatsApp
              </Button>

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  backgroundColor: "#8E44AD",
                }}
                onClick={() => navigate(`/booking/${provider._id}`)}
              >
                Book Service
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h5" fontWeight="bold">
              About Provider
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography mb={2}>
              {provider.description || "No description available."}
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Experience</Typography>

                    <Typography variant="h6">
                      {provider.experience} Years
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">
                      Starting Price
                    </Typography>

                    <Typography variant="h6">₹ {provider.price}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Phone</Typography>

                    <Typography variant="h6">
                      {provider.phone || "Not Available"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">WhatsApp</Typography>

                    <Typography variant="h6">
                      {provider.whatsapp || "Not Available"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Box mt={5}>
              <Typography variant="h5" fontWeight="bold" mb={2}>
                Portfolio
              </Typography>

              <Divider sx={{ mb: 3 }} />

              <Box display="flex" gap={2} flexWrap="wrap">
                {provider.portfolio?.length > 0 ? (
                  provider.portfolio.map((img) => (
                    <img
                      key={img.public_id}
                      src={img.url}
                      alt="Portfolio"
                      width="180"
                      height="180"
                      style={{
                        borderRadius: 10,
                        objectFit: "cover",
                      }}
                    />
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No portfolio uploaded.
                  </Typography>
                )}
              </Box>
            </Box>

            <Box mt={5}>
              <Typography variant="h5" fontWeight="bold" mb={2}>
                Reviews
              </Typography>

              <Divider sx={{ mb: 3 }} />

              {reviews.length === 0 ? (
                <Typography color="text.secondary">No reviews yet.</Typography>
              ) : (
                reviews.map((review) => (
                  <Card key={review._id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={
                            review.reviewer?.photo ||
                            `https://ui-avatars.com/api/?name=${review.reviewer?.name}`
                          }
                        />

                        <Box>
                          <Typography fontWeight="bold">
                            {review.reviewer?.name}
                          </Typography>

                          <Rating value={review.rating} readOnly size="small" />
                        </Box>
                      </Box>

                      <Typography mt={2}>{review.comment}</Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default ProviderDetails;
