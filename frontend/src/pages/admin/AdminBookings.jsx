import { useEffect, useState } from "react";
import api from "../../api/api";

import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

function AdminBookings() {
  const [bookings, setBookings] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [open, setOpen] = useState(false);

  const bookingsPerPage = 5;

  const fetchBookings = async () => {
    try {
      const response = await api.get("/admin/bookings");

      setBookings(response.data.bookings);
    } catch (error) {
      console.log(error);
    }
  };

  const handleOpen = (booking) => {
    setSelectedBooking(booking);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedBooking(null);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.provider?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const paginatedBookings = filteredBookings.slice(
    (page - 1) * bookingsPerPage,
    page * bookingsPerPage,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Manage Bookings
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>

          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedBookings.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell>{booking.customer?.name}</TableCell>

                <TableCell>{booking.provider?.name}</TableCell>

                <TableCell>{booking.service}</TableCell>

                <TableCell>
                  {new Date(booking.bookingDate).toLocaleDateString()}
                </TableCell>

                <TableCell>
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
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleOpen(booking)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box mt={3} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={page}
          color="primary"
          onChange={(e, value) => setPage(value)}
        />
      </Box>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>

        <DialogContent dividers>
          {selectedBooking && (
            <>
              <p>
                <strong>Customer:</strong> {selectedBooking.customer?.name}
              </p>

              <p>
                <strong>Provider:</strong> {selectedBooking.provider?.name}
              </p>

              <p>
                <strong>Service:</strong> {selectedBooking.service}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedBooking.bookingDate).toLocaleDateString()}
              </p>

              <p>
                <strong>Address:</strong> {selectedBooking.address}
              </p>

              <p>
                <strong>Message:</strong> {selectedBooking.message}
              </p>

              <p>
                <strong>Status:</strong> {selectedBooking.status}
              </p>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminBookings;
