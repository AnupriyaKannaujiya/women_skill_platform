import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

function Contact() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography
        variant="h3"
        align="center"
        fontWeight="bold"
        gutterBottom
      >
        Contact Us
      </Typography>

      <Typography
        align="center"
        color="text.secondary"
        sx={{ mb: 5 }}
      >
        We'd love to hear from you. Fill out the form below and we'll get back
        to you.
      </Typography>

      <Paper sx={{ p: 4 }}>
        <Grid container spacing={3}>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Full Name"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Subject"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Message"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
            >
              Send Message
            </Button>
          </Grid>

        </Grid>
      </Paper>

      <Box mt={5} textAlign="center">

        <Typography variant="h6">
          Contact Information
        </Typography>

        <Typography>
          📧 support@womenskillplatform.com
        </Typography>

        <Typography>
          📞 +91 9876543210
        </Typography>

        <Typography>
          📍 Lucknow, Uttar Pradesh, India
        </Typography>

      </Box>
    </Container>
  );
}

export default Contact;