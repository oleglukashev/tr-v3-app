'use client'

import * as React from 'react';
import {styled, useTheme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import {useGetAllQuery} from "@/lib/redux/api/pairApi";
import {useGetSettingsDhmQuery} from "@/lib/redux/api/dhmApi";
import Avatar from '@mui/material/Avatar';
import {usePathname, useRouter} from "next/navigation";
import {useMemo} from "react";
import Link from '@/src/theme/overrides/components/link';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.common.white,
  boxShadow: theme.customShadows.card,
  padding: '8px 12px',
}));

export default function AdminHeader() {
  const theme = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [anchorPairEl, setAnchorPairEl] = React.useState<null | HTMLElement>(null);
  const [anchorPageEl, setAnchorPageEl] = React.useState<null | HTMLElement>(null);
  const [anchorTfEl, setAnchorTfEl] = React.useState<null | HTMLElement>(null);
  const openPair = Boolean(anchorPairEl);
  const openPage = Boolean(anchorPageEl);
  const openTf = Boolean(anchorTfEl);
  const handlePairClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorPairEl(event.currentTarget);
  };
  const handleTfClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorTfEl(event.currentTarget);
  };
  const handlePageClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorPageEl(event.currentTarget);
  };
  const handlePairClose = () => {
    setAnchorPairEl(null);
  };
  const handlePageClose = () => {
    setAnchorPageEl(null);
  };
  const handleTfClose = () => {
    setAnchorTfEl(null);
  };
  const { data: pairs, isLoading } = useGetAllQuery({});
  const { data: settings } = useGetSettingsDhmQuery({});
  const tfs = [
    {id: 1, label: '1'},
    {id: 5, label: '5'},
    {id: 15, label: '15'},
    {id: 30, label: '30'},
    {id: 60, label: '1H'},
    {id: 240, label: '4h'},
    {id: 1440, label: '1D'},
  ]
  const pathname = usePathname();
  const pages = [
    { url: 'dhm-graph', label: 'DHM (graph)' },
    { url: 'dhm2-graph', label: 'DHM2 (graph)' },
    { url: 'dhm-graph-test', label: 'DHM (graph) TEST' },
    { url: 'dhm2-graph-test', label: 'DHM2 (graph) TEST' },
    { url: 'dhm', label: 'DHMs' },
    { url: 'clusters', label: 'Clusters' },
    { url: 'experiments', label: 'Experiments (graph)' },
    { url: 'experiments2', label: 'Experiments2 (graph)' },
    { url: 'tda', label: 'TDA' },
    { url: 'admin', label: 'Admin' },
  ]
  const router = useRouter();
  const pair = useMemo(() => {
    let pairId: any = pathname.split('/')[2];
    pairId = pairId ? parseInt(pairId) : null;
    return (pairs || []).find(item => item.id === pairId);
  }, [pairs, pathname]);

  const tf = useMemo(() => {
    let tf: any = pathname.split('/')[3];
    tf = tf ? parseInt(tf) : null;
    return tfs.find(item => item.id === tf);
  }, [tfs, pathname]);

  const page = useMemo(() => {
    let pageUrl: any = pathname.split('/')[1];
    return pages.find(item => item.url === pageUrl);
  }, [pathname]);

  const settingsByPairId = useMemo(() => {
    const result: any = {}
    if (!settings?.length) { return result }
    for (const setting of settings) {
      result[setting.pairId] = true
    }
    return result;
  }, [settings]);

  return (
    <AppBar
      position="relative"
      // enableColorOnDark
      sx={{
        // boxShadow: 0,
        // bgcolor: 'transparent',
        // backgroundImage: 'none',
        mt: 'calc(var(--template-frame-height, 0px) + 8px)',
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0 }}>
            <Box sx={{ display: 'flex' }}>
              <Avatar sx={{ mr: 1 }} alt="Traken" src="/images/logo.png" />
              <Button
                href="/admin/pairs"
              >
                Pairs
              </Button>
              <Button
                href="/admin/stats"
              >
                Stats
              </Button>
              <Button
                href="/admin/storages"
              >
                Storages
              </Button>
            </Box>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
