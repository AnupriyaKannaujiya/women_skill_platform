import { Box, Container, Grid, Paper, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

function About() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography
        variant="h3"
        align="center"
        fontWeight="bold"
        gutterBottom
      >
        About Women Skill Platform
      </Typography>

      <Typography
        variant="h6"
        color="text.secondary"
        align="center"
        sx={{ mb: 6 }}
      >
        Empowering skilled women by connecting them directly with customers.
      </Typography>

      <Paper sx={{ p: 4, mb: 6 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Our Mission
        </Typography>

        <Typography>
          Women Skill Platform is designed to help talented women earn from
          their skills while working from home. Customers can easily find
          trusted service providers such as Mehndi artists, beauticians,
          tailors, tutors, cooks and many more without any middleman.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 4, textAlign: "center", height: "100%" }}>
            <GroupsIcon color="primary" sx={{ fontSize: 60 }} />

            <Typography variant="h6" mt={2}>
              Community
            </Typography>

            <Typography color="text.secondary">
              Building a trusted community of skilled women and customers.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 4, textAlign: "center", height: "100%" }}>
            <VolunteerActivismIcon color="success" sx={{ fontSize: 60 }} />

            <Typography variant="h6" mt={2}>
              Empowerment
            </Typography>

            <Typography color="text.secondary">
              Helping women become financially independent through their
              talents.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 4, textAlign: "center", height: "100%" }}>
            <WorkspacePremiumIcon color="warning" sx={{ fontSize: 60 }} />

            <Typography variant="h6" mt={2}>
              Quality Services
            </Typography>

            <Typography color="text.secondary">
              Customers can easily find verified and skilled professionals.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default About;