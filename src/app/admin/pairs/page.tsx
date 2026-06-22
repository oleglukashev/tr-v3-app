'use client'

import { useState } from "react";
import Container from "@mui/material/Container";
import { Tabs, Tab } from "@mui/material";
import AdminPairsIndexView from "@/src/sections/admin/pairs/view/pairs-view-index";
import XvPrecisionView from "@/src/sections/admin/pairs/view/xv-precision-view";

export default function AdminPairsIndexPage() {
  const [tab, setTab] = useState(0);
  return (
    <Container sx={{ pt: 2 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Пары" />
        <Tab label="XV precision" />
      </Tabs>
      {tab === 0 && <AdminPairsIndexView />}
      {tab === 1 && <XvPrecisionView />}
    </Container>
  );
}
