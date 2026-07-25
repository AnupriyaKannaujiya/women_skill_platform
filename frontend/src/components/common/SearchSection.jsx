import { useState } from "react";
import api from "../../api/api";
import {
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";

function SearchSection({ city, setCity, skill, setSkill, setProviders }) {
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/search", {
        params: {
          city,
          skill,
        },
      });

      setProviders(response.data.users);

      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="City"
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
              <MenuItem value="">Select Skill</MenuItem>
              <MenuItem value="Mehndi">Mehndi</MenuItem>
              <MenuItem value="Tailoring">Tailoring</MenuItem>
              <MenuItem value="Beautician">Beautician</MenuItem>
              <MenuItem value="Cooking">Cooking</MenuItem>
              <MenuItem value="Home Tuition">Home Tuition</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              fullWidth
              variant="contained"
              sx={{ height: "56px" }}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default SearchSection;
