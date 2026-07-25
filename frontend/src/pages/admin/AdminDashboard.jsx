import { useEffect, useState } from "react";
import api from "../../api/api";

import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from "@mui/material";

import GroupsIcon from "@mui/icons-material/Groups";
import EngineeringIcon from "@mui/icons-material/Engineering";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import StarIcon from "@mui/icons-material/Star";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);

  const usersPerPage = 5;

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/admin/dashboard");

      setStats(response.data.stats);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");

      setUsers(response.data.users);
    } catch (error) {
      console.log(error);
    }
  };

  const toggleBlock = async (id) => {
    try {
      const response = await api.put(`/admin/users/${id}/block`);

      alert(response.data.message);

      fetchUsers();
      fetchDashboard();
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  const deleteUser = async (id) => {
    try {
      if (!window.confirm("Are you sure you want to delete this user?")) return;

      await api.delete(`/admin/users/${id}`);

      fetchUsers();
      fetchDashboard();
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
  }, []);

  if (!stats) {
    return (
      <Container sx={{ py: 5 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <GroupsIcon fontSize="large" />,
      color: "#1976d2",
    },
    {
      title: "Providers",
      value: stats.totalProviders,
      icon: <EngineeringIcon fontSize="large" />,
      color: "#8E44AD",
    },
    {
      title: "Customers",
      value: stats.totalCustomers,
      icon: <PersonIcon fontSize="large" />,
      color: "#43A047",
    },
    {
      title: "Admins",
      value: stats.totalAdmins,
      icon: <AdminPanelSettingsIcon fontSize="large" />,
      color: "#E53935",
    },
    {
      title: "Bookings",
      value: stats.totalBookings,
      icon: <EventAvailableIcon fontSize="large" />,
      color: "#FB8C00",
    },
    {
      title: "Pending",
      value: stats.pendingBookings,
      icon: <PendingActionsIcon fontSize="large" />,
      color: "#FBC02D",
    },
    {
      title: "Accepted",
      value: stats.acceptedBookings,
      icon: <CheckCircleIcon fontSize="large" />,
      color: "#00ACC1",
    },
    {
      title: "Completed",
      value: stats.completedBookings,
      icon: <TaskAltIcon fontSize="large" />,
      color: "#5E35B1",
    },
    {
      title: "Reviews",
      value: stats.totalReviews,
      icon: <StarIcon fontSize="large" />,
      color: "#EC407A",
    },
  ];

  const chartData = [
    {
      name: "Users",
      value: stats.totalUsers,
    },
    {
      name: "Providers",
      value: stats.totalProviders,
    },
    {
      name: "Customers",
      value: stats.totalCustomers,
    },
    {
      name: "Admins",
      value: stats.totalAdmins,
    },
  ];

  const pieData = [
    {
      name: "Providers",
      value: stats.totalProviders,
    },
    {
      name: "Customers",
      value: stats.totalCustomers,
    },
    {
      name: "Admins",
      value: stats.totalAdmins,
    },
  ];

  const COLORS = ["#8E44AD", "#43A047", "#E53935"];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !user.isBlocked) ||
      (statusFilter === "blocked" && user.isBlocked);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * usersPerPage,
    page * usersPerPage,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={card.title}>
            <Paper
              elevation={5}
              sx={{
                p: 3,
                borderRadius: 4,
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: 10,
                },
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography color="text.secondary">{card.title}</Typography>

                  <Typography variant="h3" fontWeight="bold" mt={1}>
                    {card.value}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    bgcolor: card.color,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "white",
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box mt={6}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                height: 350,
              }}
            >
              <Typography variant="h6" mb={2}>
                Users Overview
              </Typography>

              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8E44AD" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                height: 350,
              }}
            >
              <Typography variant="h6" mb={2}>
                Users Distribution
              </Typography>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        <Paper
          sx={{
            p: 3,
            height: 350,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Bar dataKey="value" fill="#8E44AD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Box mt={6}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Manage Users
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
            label="Search User"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Role</InputLabel>

            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="provider">Provider</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>

            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>

                  <TableCell>{user.email}</TableCell>

                  <TableCell>{user.role}</TableCell>

                  <TableCell>
                    <Chip
                      label={user.isBlocked ? "Blocked" : "Active"}
                      color={user.isBlocked ? "error" : "success"}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      color={user.isBlocked ? "success" : "warning"}
                      sx={{ mr: 1 }}
                      onClick={() => toggleBlock(user._id)}
                    >
                      {user.isBlocked ? "Unblock" : "Block"}
                    </Button>

                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={() => deleteUser(user._id)}
                    >
                      Delete
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
            onChange={(event, value) => setPage(value)}
          />
        </Box>
      </Box>
    </Container>
  );
}

export default AdminDashboard;
