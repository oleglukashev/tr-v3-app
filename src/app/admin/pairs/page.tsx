'use client'

import { useState } from "react";
import Container from "@mui/material/Container";
import { Box, Card, CardContent, Tabs, Tab } from "@mui/material";
import AdminPairsIndexView from "@/src/sections/admin/pairs/view/pairs-view-index";
import XvPrecisionView from "@/src/sections/admin/pairs/view/xv-precision-view";

export default function AdminPairsIndexPage() {
  const [tab, setTab] = useState(0);
  return (
    <Container sx={{ pt: 2 }}>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Пары" />
          <Tab label="XV precision" />
        </Tabs>
        <CardContent>
          <Box role="tabpanel">
            {tab === 0 && <AdminPairsIndexView />}
            {tab === 1 && <XvPrecisionView />}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
