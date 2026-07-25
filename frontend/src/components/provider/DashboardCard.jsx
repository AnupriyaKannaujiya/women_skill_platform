import { Card, CardContent, Typography } from "@mui/material";

function DashboardCard({ title, value }) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
        transition: "0.3s",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
        },
      }}
    >
      <CardContent>
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>

        <Typography color="text.secondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}

export default DashboardCard;
