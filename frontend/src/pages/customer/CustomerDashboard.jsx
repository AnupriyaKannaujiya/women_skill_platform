import { useEffect, useState } from "react";
import api from "../../api/api";

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Button,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function CustomerDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [bookings, setBookings] = useState([]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/bookings/customer/dashboard");

      setDashboard(response.data.dashboard);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get("/bookings/my");

      setBookings(response.data.bookings);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchBookings();
  }, []);

  if (!dashboard) {
    return (
      <Container sx={{ py: 5 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Customer Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography>Total Bookings</Typography>

            <Typography variant="h4">{dashboard.totalBookings}</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography>Pending</Typography>

            <Typography variant="h4">{dashboard.pendingBookings}</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography>Accepted</Typography>

            <Typography variant="h4">{dashboard.acceptedBookings}</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography>Completed</Typography>

            <Typography variant="h4">{dashboard.completedBookings}</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Box mt={5}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          My Bookings
        </Typography>

        {bookings.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography>No bookings found.</Typography>
          </Paper>
        ) : (
          bookings.map((booking) => (
            <Card
              key={booking._id}
              sx={{
                mb: 2,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar src={booking.provider.photo} />

                  <Box flex={1}>
                    <Typography variant="h6">
                      {booking.provider.name}
                    </Typography>

                    <Typography color="text.secondary">
                      {booking.provider.city}
                    </Typography>
                  </Box>

                  <Chip
                    label={booking.status}
                    color={
                      booking.status === "pending"
                        ? "warning"
                        : booking.status === "accepted"
                          ? "success"
                          : booking.status === "completed"
                            ? "primary"
                            : "error"
                    }
                  />
                  {booking.status === "accepted" && (
                    <Stack direction="row" spacing={2} mt={2}>
                      <Button
                        variant="contained"
                        color="success"
                        href={`tel:${booking.provider.phone}`}
                      >
                        Call Provider
                      </Button>

                      <Button
                        variant="contained"
                        color="primary"
                        href={`https://wa.me/91${booking.provider.whatsapp}`}
                        target="_blank"
                      >
                        WhatsApp
                      </Button>
                    </Stack>
                  )}
                  {booking.status === "completed" && (
                    <Box mt={2}>
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() =>
                          navigate(`/review/${booking.provider._id}`)
                        }
                      >
                        Write Review
                      </Button>
                    </Box>
                  )}
                </Box>

                <Typography mt={2}>
                  <strong>Service :</strong> {booking.service}
                </Typography>

                <Typography>
                  <strong>Date :</strong>{" "}
                  {new Date(booking.bookingDate).toLocaleDateString()}
                </Typography>

                <Typography>
                  <strong>Address :</strong> {booking.address}
                </Typography>

                {booking.message && (
                  <Typography>
                    <strong>Message :</strong> {booking.message}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Container>
  );
}

export default CustomerDashboard;
