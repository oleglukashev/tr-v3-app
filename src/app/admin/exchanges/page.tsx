'use client'

import Container from "@mui/material/Container";
import AdminExchangesIndexView from "@/src/sections/admin/exchanges/view/exchanges-view-index";

export default function AdminExchangesIndexPage() {
  return (
    <Container sx={{ pt: 2 }}>
      <AdminExchangesIndexView />
    </Container>
  );
}
