import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Menu, MenuItem, Avatar, Divider } from "@mui/material";

import { useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  const token = localStorage.getItem("token");

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Women Skill Platform
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>

          <Button color="inherit" component={Link} to="/providers">
            Providers
          </Button>

          <Button color="inherit" component={Link} to="/about">
            About
          </Button>

          <Button color="inherit" component={Link} to="/contact">
            Contact
          </Button>

          {token ? (
            <>
              <Avatar
                src={user?.photo}
                sx={{
                  width: 40,
                  height: 40,
                  cursor: "pointer",
                  ml: 1,
                }}
                onClick={handleMenuOpen}
              />

              <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                <MenuItem disabled>{user?.name}</MenuItem>

                <Divider />

                {user?.role === "provider" && (
                  <>
                    <MenuItem
                      onClick={() => {
                        navigate("/provider/dashboard");
                        handleMenuClose();
                      }}
                    >
                      Dashboard
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        navigate("/provider/edit-profile");
                        handleMenuClose();
                      }}
                    >
                      Edit Profile
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        navigate("/provider/portfolio");
                        handleMenuClose();
                      }}
                    >
                      Portfolio
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        navigate("/provider/change-password");
                        handleMenuClose();
                      }}
                    >
                      Change Password
                    </MenuItem>

                    <Divider />
                  </>
                )}
                <Divider />

                {user?.role === "customer" && (
                  <>
                    <MenuItem
                      onClick={() => {
                        navigate("/customer/dashboard");
                        handleMenuClose();
                      }}
                    >
                      Dashboard
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        navigate("/customer/edit-profile");
                        handleMenuClose();
                      }}
                    >
                      Edit Profile
                    </MenuItem>

                    <Divider />
                  </>
                )}

                {user?.role === "admin" && (
                  <>
                    <MenuItem
                      onClick={() => {
                        navigate("/admin/dashboard");
                        handleMenuClose();
                      }}
                    >
                      Dashboard
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        navigate("/admin/bookings");
                        handleMenuClose();
                      }}
                    >
                      Manage Bookings
                    </MenuItem>

                    <Divider />
                  </>
                )}

                <MenuItem
                  onClick={() => {
                    navigate("/admin/reviews");
                    handleMenuClose();
                  }}
                >
                  Manage Reviews
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleLogout();
                    handleMenuClose();
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>

              <Button color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
