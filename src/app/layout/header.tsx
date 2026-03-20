'use client'

import * as React from 'react';
import {styled, alpha, useTheme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import {useGetAllQuery} from "@/lib/redux/api/pairApi";
import {useGetSettingsDhmQuery} from "@/lib/redux/api/dhmApi";
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useMemo} from "react";
import {Divider, IconButton, Typography} from "@mui/material";
import Iconify from "@/src/components/iconify";
import {useGetQuery} from "@/lib/redux/api/balanceApi";

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

export default function Header() {
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
  const { data: balance, isLoading: isBalanceLoading } = useGetQuery({});
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
  const searchParams = useSearchParams();
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
  const ts = searchParams.get('ts');
  const showChartSettingsButton = page?.url === 'dhm-graph';

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
      position="fixed"
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
                variant="text"
                aria-controls={openPage ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openPage ? 'true' : undefined}
                onClick={handlePageClick}
                sx={{
                  '&:hover': {
                    background: 'none',
                  },
                }}
              >
                {mounted ? page?.label : ''}
              </Button>
              <Menu
                anchorEl={anchorPageEl}
                open={openPage}
                onClose={handlePageClose}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                }}
              >
                {(pages || []).map((item: any) => (
                  item.url === 'tda' || item.url === 'admin' ? (
                    <MenuItem key={item.url} onClick={() => router.replace(`/${item.url}`)}>{item.label}</MenuItem>
                  ) : (
                    <MenuItem key={item.url} onClick={() => router.replace(`/${item.url}/${pair?.id || pairs?.[0]?.id}/${tf?.id || tfs?.[0]?.id}`)}>{item.label}</MenuItem>
                  )
                ))}
              </Menu>
              <Divider sx={{ mx: 1 }} orientation="vertical" flexItem />
              <Button
                variant="text"
                sx={{
                  mr: 1,
                  '&:hover': {
                    background: 'none',
                  },
                }}
                aria-controls={openPair ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openPair ? 'true' : undefined}
                onClick={handlePairClick}
              >
                {mounted ? pair?.name : ''}
              </Button>
              <Menu
                anchorEl={anchorPairEl}
                open={openPair}
                onClose={handlePairClose}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                }}
              >
                {(pairs || []).map((item: any) => (
                  <MenuItem sx={{
                    backgroundColor: settingsByPairId[item.id] ? theme.palette.primary.main : 'white',
                    color: settingsByPairId[item.id] ? 'white' : theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: settingsByPairId[item.id] ? theme.palette.primary.main : 'white',
                    }
                  }} key={item.id} onClick={() => router.replace(`/${page.url}/${item.id}/${tf.id}`)}>
                    {item.name}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                variant="text"
                sx={{
                  '&:hover': {
                    background: 'none',
                  },
                }}
                aria-controls={openTf ? 'basic-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openTf ? 'true' : undefined}
                onClick={handleTfClick}
              >
                {mounted ? tf?.label : ''}
              </Button>
              <Menu
                anchorEl={anchorTfEl}
                open={openTf}
                onClose={handleTfClose}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                }}
              >
                {tfs.map((item: any) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => router.replace(`/${page?.url}/${pair.id}/${item.id}${ts ? `?ts=${ts}` : ''}`)}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>

            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '#4caf50', fontWeight: 'bold'}}>{balance?.up ? Number(balance.up).toFixed(2) : '-'}</Typography>
            <Typography sx={{ color: '#f44336', fontWeight: 'bold', mr: 2 }}>{balance?.down ? Number(balance.down).toFixed(2) : '-'}</Typography>
          </Box>
          {showChartSettingsButton && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                aria-label="Open chart settings"
                onClick={() => {
                  if (typeof window === 'undefined') { return; }
                  window.dispatchEvent(new Event('open-chart-settings-dialog'));
                }}
              >
                <Iconify icon="icon-park-outline:chart-line" width={22} />
              </IconButton>
            </Box>
          )}
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
