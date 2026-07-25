import { Avatar, IconButton } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useRef } from "react";
import { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
} from "@mui/material";

function EditProfile() {
  const fileInputRef = useRef(null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [formData, setFormData] = useState({
    photo: "",
    name: "",
    phone: "",
    whatsapp: "",
    city: "",
    area: "",
    skill: "",
    experience: "",
    price: "",
    description: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedPhoto(file);

    setFormData((prev) => ({
      ...prev,
      photo: "",
    }));
  };

  const handleRemovePhoto = async () => {
    try {
      const response = await api.delete("/auth/remove-photo");

      alert(response.data.message);

      setSelectedPhoto(null);

      setFormData({
        ...formData,
        photo: "",
      });
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  const handleSubmit = async () => {
    try {
      let photoUrl = formData.photo;
      if (selectedPhoto) {
        const photoData = new FormData();

        photoData.append("photo", selectedPhoto);

        const uploadResponse = await api.post("/auth/upload-photo", photoData);

        photoUrl = uploadResponse.data.photo;

        setFormData((prev) => ({
          ...prev,
          photo: uploadResponse.data.photo,
        }));

        setSelectedPhoto(null);
      }
      const response = await api.put("/auth/profile", {
        ...formData,
        photo: photoUrl,
      });

      setFormData({
        ...response.data.user,
        skill: response.data.user.skill || "",
      });

      alert(response.data.message);
    } catch (error) {
      console.log(error.response?.data);
      console.log(error);

      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/profile");

        const user = response.data;
        setFormData({
          photo: user.photo || "",
          name: user.name || "",
          phone: user.phone || "",
          whatsapp: user.whatsapp || "",
          city: user.city || "",
          area: user.area || "",
          skill: user.skill || "",
          experience: user.experience || "",
          price: user.price || "",
          description: user.description || "",
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchProfile();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Edit Profile
      </Typography>

      <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
        <Avatar
          src={formData.photo}
          sx={{
            width: 120,
            height: 120,
            mb: 2,
          }}
        />

        <input
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*"
          onChange={handlePhotoChange}
        />

        <IconButton
          color="primary"
          onClick={() => fileInputRef.current.click()}
        >
          <PhotoCameraIcon />
        </IconButton>

        <Typography variant="body2">Upload Profile Photo</Typography>

        <Button
          color="error"
          size="small"
          onClick={handleRemovePhoto}
          sx={{ mt: 1 }}
        >
          Remove Photo
        </Button>
      </Box>

      <Paper
        sx={{
          p: 4,
          borderRadius: 4,
        }}
      >
        <Box mt={2}>
          <TextField
            fullWidth
            margin="normal"
            label="Full Name"
            name="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Phone Number"
            name="phone"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="City"
            name="city"
            placeholder="Enter your city"
            value={formData.city}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Area"
            name="area"
            placeholder="Enter your area"
            value={formData.area}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Skill"
            name="skill"
            placeholder="e.g. Mehndi Artist"
            value={formData.skill}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Experience"
            name="experience"
            placeholder="Years of experience"
            value={formData.experience}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Price"
            name="price"
            placeholder="Price per service"
            value={formData.price}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Description"
            name="description"
            placeholder="Tell customers about yourself"
            multiline
            rows={4}
            value={formData.description}
            onChange={handleChange}
          />
        </Box>

        <Box mt={3} display="flex" justifyContent="center">
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            size="large"
            sx={{
              mt: 3,
              backgroundColor: "#8E44AD",
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#732d91",
              },
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default EditProfile;
