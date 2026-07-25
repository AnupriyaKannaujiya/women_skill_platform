import { useEffect, useState } from "react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
} from "@mui/material";

function Providers() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);

  const [skill, setSkill] = useState("");

  const [city, setCity] = useState("");

  const fetchProviders = async () => {
    try {
      const response = await api.get("/users/search", {
        params: {
          skill,
          city,
        },
      });

      setProviders(response.data.users);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchProviders();
  }, []);
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight="bold" align="center" mb={4}>
        Find Skilled Women
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" mb={5}>
        <TextField
          label="Skill"
          placeholder="e.g. Mehndi"
          fullWidth
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />

        <TextField
          label="City"
          placeholder="e.g. Lucknow"
          fullWidth
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <Button variant="contained" size="large" onClick={fetchProviders}>
          Search
        </Button>
      </Box>

      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} sm={6} md={4} key={provider._id}>
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: 3,
                p: 3,
                height: "100%",
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                {provider.name}
              </Typography>

              <Typography color="text.secondary">{provider.skill}</Typography>

              <Typography color="text.secondary">{provider.city}</Typography>

              <Typography mt={1}>
                Experience: {provider.experience} Years
              </Typography>

              <Typography mb={2}>₹ {provider.price}</Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate(`/providers/${provider._id}`)}
              >
                View Profile
              </Button>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Providers;
