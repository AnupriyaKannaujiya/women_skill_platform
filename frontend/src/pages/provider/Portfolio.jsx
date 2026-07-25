import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Grid,
  Card,
  CardMedia,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import api from "../../api/api";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";

function Portfolio() {
  const fileInputRef = useRef(null);
  const [selectedImages, setSelectedImages] = useState([]);

  const [portfolio, setPortfolio] = useState([]);
  const handleFileChange = (e) => {
    setSelectedImages([...e.target.files]);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();

      selectedImages.forEach((image) => {
        formData.append("portfolio", image);
      });

      const response = await api.post("/auth/upload-portfolio", formData);

      await fetchPortfolio();

      setSelectedImages([]);

      alert(response.data.message);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await api.get("/auth/profile");

      console.log(response.data);

      setPortfolio(response.data.portfolio);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleDelete = async (imageId) => {
    try {
      const response = await api.delete(`/auth/portfolio/${imageId}`);

      await fetchPortfolio();

      alert(response.data.message);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Delete failed");
    }
  };
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Portfolio
      </Typography>

      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" mb={2}>
          Upload Your Work
        </Typography>

        <input
          type="file"
          hidden
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current.click()}
          >
            Choose Images
          </Button>

          <Button variant="contained" onClick={handleUpload}>
            Upload
          </Button>
        </Box>
        {selectedImages.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight="bold">
              Selected Images:
            </Typography>

            {selectedImages.map((image, index) => (
              <Typography key={index}>• {image.name}</Typography>
            ))}
          </Box>
        )}
      </Paper>
      <Grid container spacing={3} mt={2}>
        {portfolio.map((image, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                borderRadius: 3,
                position: "relative",
              }}
            >
              <IconButton
                onClick={() => handleDelete(image._id)}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(255,255,255,0.8)",

                  "&:hover": {
                    backgroundColor: "#fff",
                  },
                }}
              >
                <DeleteIcon color="error" />
              </IconButton>

              <CardMedia
                component="img"
                height="220"
                image={image.url}
                alt="Portfolio"
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Portfolio;
