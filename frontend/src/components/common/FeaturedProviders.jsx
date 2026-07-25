import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from "@mui/material";

function FeaturedProviders({ providers }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" fontWeight="bold" mb={5}>
          Featured Providers
        </Typography>

        <Grid container spacing={3}>
          {providers.length === 0 ? (
            <Typography textAlign="center" width="100%" color="text.secondary">
              No providers found.
            </Typography>
          ) : (
            providers.map((provider) => {
              return (
                <Grid key={provider._id} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ textAlign: "center", p: 3 }}>
                    <Avatar
                      src={provider.photo}
                      sx={{
                        width: 80,
                        height: 80,
                        mx: "auto",
                        mb: 2,
                      }}
                    />

                    <CardContent>
                      <Typography variant="h6">{provider.name}</Typography>

                      <Typography color="text.secondary">
                        {provider.skill?.join(", ")}
                      </Typography>

                      <Typography color="text.secondary" mb={2}>
                        {provider.city}
                      </Typography>

                      <Button
                        variant="contained"
                        onClick={() => navigate(`/providers/${provider._id}`)}
                      >
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      </Container>
    </Box>
  );
}

export default FeaturedProviders;
