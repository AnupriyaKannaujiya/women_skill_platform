import { useState } from "react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  Typography,
  Link,
} from "@mui/material";

import { Visibility, VisibilityOff } from "@mui/icons-material";

import CustomInput from "../../components/common/AuthInput";
import CustomButton from "../../components/common/CustomButton";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setErrors({
      ...errors,
      [e.target.name]: "",
    });
  };

  const validateForm = () => {
    let newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const response = await api.post("/auth/login", formData);

      localStorage.setItem("token", response.data.token);

      localStorage.setItem("user", JSON.stringify(response.data.user));

      const user = response.data.user;

      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "provider") {
        navigate("/provider/dashboard");
      } else {
        navigate("/customer/dashboard");
      }

      console.log(response.data);

      setLoading(false);
    } catch (error) {
      setLoading(false);

      console.log(error);

      alert(error.response.data.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg,#8E44AD 0%,#FF6B9A 100%)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
          filter: "blur(90px)",
          top: -80,
          left: -100,
        }}
      />

      <Box
        sx={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "rgba(255,105,180,0.2)",
          filter: "blur(120px)",
          bottom: -80,
          right: -100,
        }}
      />

      <Container maxWidth="xs">
        <Card
          sx={{
            backdropFilter: "blur(25px)",
            background: "rgba(255,255,255,0.28)",
            border: "1px solid rgba(255,255,255,0.45)",
            borderRadius: 5,
            boxShadow: "0 8px 32px rgba(0,0,0,.35)",
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Typography
              variant="h3"
              fontWeight="bold"
              textAlign="center"
              color="white"
              mb={1}
              sx={{
                textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              }}
            >
              Welcome Back
            </Typography>

            <Typography textAlign="center" color="white" mb={4}>
              Login to your account
            </Typography>

            <CustomInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <CustomInput
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        sx={{ color: "white" }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 1,
                mb: 3,
              }}
            >
              <Link href="#" underline="hover" color="white">
                Forgot Password?
              </Link>
            </Box>

            <CustomButton onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </CustomButton>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default Login;
