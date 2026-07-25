import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Rating,
  Box,
} from "@mui/material";

function Review() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);

  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    try {
      const response = await api.post("/reviews", {
        provider: id,
        rating,
        comment,
      });

      alert(response.data.message);

      navigate("/customer/dashboard");
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Write Review
        </Typography>

        <Typography mb={2}>Give Rating</Typography>

        <Rating
          value={rating}
          onChange={(event, newValue) => setRating(newValue)}
          size="large"
        />

        <TextField
          fullWidth
          multiline
          rows={5}
          margin="normal"
          label="Write your review"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <Box mt={3}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
          >
            Submit Review
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Review;