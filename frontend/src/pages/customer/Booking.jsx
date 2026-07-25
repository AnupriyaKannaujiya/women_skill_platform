import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";

import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
} from "@mui/material";

function Booking() {
  const { id } = useParams();

  const [formData, setFormData] = useState({
    service: "",
    bookingDate: "",
    address: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBooking = async () => {
    try {
      const response = await api.post("/bookings", {
        provider: id,
        ...formData,
      });

      alert(response.data.message);
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Book Service
        </Typography>

        <TextField
          fullWidth
          margin="normal"
          label="Service"
          name="service"
          value={formData.service}
          onChange={handleChange}
        />

        <TextField
          fullWidth
          margin="normal"
          type="date"
          name="bookingDate"
          value={formData.bookingDate}
          onChange={handleChange}
          InputLabelProps={{
            shrink: true,
          }}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Message"
          multiline
          rows={4}
          name="message"
          value={formData.message}
          onChange={handleChange}
        />

        <Box mt={3}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleBooking}
          >
            Send Booking Request
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Booking;