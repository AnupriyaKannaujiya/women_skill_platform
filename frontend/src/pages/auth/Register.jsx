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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { Visibility, VisibilityOff } from "@mui/icons-material";

import CustomInput from "../../components/common/AuthInput";
import CustomButton from "../../components/common/CustomButton";

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    skill: "",
    city: "",
    whatsapp: "",
    experience: "",
    price: "",
    description: "",
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

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      const response = await api.post("/auth/register", formData);

      console.log(response.data);

      alert(response.data.message);

      navigate("/login");

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
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
              Create Account
            </Typography>

            <Typography textAlign="center" color="white" mb={4}>
              Create your account to get started
            </Typography>

            <CustomInput
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />

            <CustomInput
              label="Email"
              name="email"
              type="email"
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
            <CustomInput
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            <FormControl
              fullWidth
              margin="normal"
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "white",

                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.35)",
                  },

                  "&:hover fieldset": {
                    borderColor: "white",
                  },

                  "&.Mui-focused fieldset": {
                    borderColor: "white",
                  },
                },
              }}
            >
              <InputLabel
                sx={{
                  color: "white",
                  "&.Mui-focused": {
                    color: "white",
                  },
                }}
              >
                Role
              </InputLabel>

              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
                sx={{
                  color: "white",
                  "& .MuiSelect-icon": {
                    color: "white",
                  },
                }}
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
              </Select>
            </FormControl>

            {formData.role === "provider" && (
              <>
                <CustomInput
                  label="Skill"
                  name="skill"
                  value={formData.skill}
                  onChange={handleChange}
                />

                <CustomInput
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />

                <CustomInput
                  label="WhatsApp Number"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />

                <CustomInput
                  label="Experience (Years)"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                />

                <CustomInput
                  label="Price (₹)"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                />

                <CustomInput
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={3}
                />
              </>
            )}

            <CustomButton onClick={handleRegister} disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </CustomButton>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default Register;
