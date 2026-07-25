import { useEffect, useState } from "react";
import api from "../../api/api";

import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Rating,
  Button,
} from "@mui/material";

function AdminReviews() {
  const [reviews, setReviews] = useState([]);

  const fetchReviews = async () => {
    try {
      const response = await api.get("/admin/reviews");

      setReviews(response.data.reviews);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteReview = async (id) => {
    try {
      if (!window.confirm("Are you sure you want to delete this review?")) {
        return;
      }

      const response = await api.delete(`/admin/reviews/${id}`);

      alert(response.data.message);

      fetchReviews();
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Manage Reviews
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reviewer</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review._id}>
                <TableCell>{review.reviewer?.name}</TableCell>

                <TableCell>{review.provider?.name}</TableCell>

                <TableCell>
                  <Rating value={review.rating} readOnly />
                </TableCell>

                <TableCell>{review.comment}</TableCell>

                <TableCell align="center">
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => deleteReview(review._id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default AdminReviews;
