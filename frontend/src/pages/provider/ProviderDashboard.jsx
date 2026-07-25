// import DashboardCard from "../../components/provider/DashboardCard";
import { useEffect, useState } from "react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  Stack,
} from "@mui/material";

function ProviderDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchBookings();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/auth/profile");

      console.log(response.data);

      setUser(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get("/bookings/provider");

      setBookings(response.data.bookings);
    } catch (error) {
      console.log(error);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, {
        status,
      });

      fetchBookings();
      fetchProfile();

      alert(`Booking ${status} successfully`);
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  const calculateProfileCompletion = () => {
    if (!user) return 0;

    let completed = 0;
    let total = 9;

    if (user.name) completed++;
    if (user.phone) completed++;
    if (user.city) completed++;
    if (user.area) completed++;
    if (user.skill) completed++;
    if (user.experience) completed++;
    if (user.price) completed++;
    if (user.description) completed++;
    if (user.photo) completed++;

    return Math.round((completed / total) * 100);
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f5f7fb",
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight="bold">
          Provider Dashboard
        </Typography>

        <Typography color="text.secondary" mt={1}>
          Welcome back! Manage your profile, bookings and portfolio here.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 4,
            borderRadius: 4,
            background: "linear-gradient(135deg,#8E44AD,#EC4899)",
            color: "white",
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            Welcome back, {user?.name || "Provider"} 👋
          </Typography>

          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            Complete your profile to get more customers and booking requests.
          </Typography>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate("/provider/edit-profile")}
              sx={{
                bgcolor: "white",
                color: "#8E44AD",
                "&:hover": {
                  bgcolor: "#f5f5f5",
                },
              }}
            >
              Complete Profile
            </Button>

            <Button
              variant="outlined"
              onClick={() => navigate("/provider/portfolio")}
              sx={{
                color: "white",
                borderColor: "white",
                "&:hover": {
                  borderColor: "white",
                },
              }}
            >
              Upload Portfolio
            </Button>
          </Box>
        </Paper>
        <Box mt={4}>
          <Box mt={5}>
            <Typography variant="h5" fontWeight="bold" mb={3}>
              Recent Booking Requests
            </Typography>

            {bookings.length === 0 ? (
              <Paper sx={{ p: 3 }}>
                <Typography>No booking requests yet.</Typography>
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
                    <Typography variant="h6">
                      {booking.customer.name}
                    </Typography>

                    <Typography>📞 {booking.customer.phone}</Typography>

                    <Typography>Service : {booking.service}</Typography>

                    <Typography>
                      Date :{" "}
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </Typography>

                    <Typography mb={2}>Address : {booking.address}</Typography>

                    <Chip
                      label={booking.status}
                      color={
                        booking.status === "pending"
                          ? "warning"
                          : booking.status === "accepted"
                            ? "success"
                            : "error"
                      }
                    />

                    {booking.status === "pending" && (
                      <Stack direction="row" spacing={2} mt={3}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => updateStatus(booking._id, "accepted")}
                        >
                          Accept
                        </Button>

                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => updateStatus(booking._id, "rejected")}
                        >
                          Reject
                        </Button>
                      </Stack>
                    )}

                    {booking.status === "accepted" && (
                      <Box mt={3}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => updateStatus(booking._id, "completed")}
                        >
                          Mark as Completed
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
          <Typography variant="h5" fontWeight="bold" mb={2}>
            Profile Completion
          </Typography>

          <Paper
            sx={{
              p: 3,
              borderRadius: 4,
            }}
          >
            <Typography variant="body1">
              Your profile is <strong>{calculateProfileCompletion()}%</strong>
              complete.
              <LinearProgress
                variant="determinate"
                value={calculateProfileCompletion()}
                sx={{
                  mt: 2,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#8E44AD",
                  },
                }}
              />
            </Typography>

            <Typography variant="body2" color="text.secondary" mt={1}>
              Complete your profile to appear in search results and receive more
              booking requests.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

export default ProviderDashboard;
