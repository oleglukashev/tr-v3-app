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
import {useGetAllDhmQuery} from "@/lib/redux/api/dhmApi";
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useMemo} from "react";
import {Chip, Divider, IconButton, Popover, Tab, Tabs, Typography} from "@mui/material";
import Iconify from "@/src/components/iconify";
import {useGetQuery} from "@/lib/redux/api/balanceApi";
import Label from "@/src/components/label";
import moment from "moment";

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
  const [anchorREl, setAnchorREl] = React.useState<null | HTMLElement>(null);
  const openR = Boolean(anchorREl);
  const handleRClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorREl(event.currentTarget);
  };
  const handleRClose = () => {
    setAnchorREl(null);
  };
  const [anchorSessionsEl, setAnchorSessionsEl] = React.useState<null | HTMLElement>(null);
  const [sessionsTab, setSessionsTab] = React.useState<string>('all');
  const openSessions = Boolean(anchorSessionsEl);

  const { data: pairs, isLoading } = useGetAllQuery({});
  const { data: balance, isLoading: isBalanceLoading } = useGetQuery({});
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
    { url: 'dhm3-graph', label: 'DHM3 S/R + FPP' },
    { url: 'dzm-graph', label: 'DZM (graph)' },
    { url: 'range-xv-graph', label: 'Range XV' },
    { url: 'dhm', label: 'DHMs' },
    { url: 'clusters', label: 'Clusters' },
    { url: 'tda', label: 'TDA' },
    { url: 'arbitrage', label: 'Арбитраж' },
    { url: 'admin', label: 'Admin' },
  ]
  const router = useRouter();
  const isRangeXv = (pathname || '').includes('/range-xv-graph');
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
  // Range XV carries R in the path (/range-xv-graph/{pairId}/{r}); other pages use ?r=.
  const r = isRangeXv ? (pathname.split('/')[3] || null) : searchParams.get('r');
  // Range XV sizes available for the current pair (the comma-separated `xvR` column).
  const rOptions = useMemo(() => {
    const raw = (pair as any)?.xvR;
    return typeof raw === 'string'
      ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
  }, [pair]);
  const showChartSettingsButton = ['dhm-graph', 'dhm3-graph', 'dzm-graph', 'range-xv-graph'].includes(page?.url ?? '');

  const rawPairId = pathname.split('/')[2] || null;
  const rawTf = pathname.split('/')[3] || null;
  const showSessionsButton = Boolean(rawPairId && rawTf);

  const { data: dhmSessions } = useGetAllDhmQuery(
    { pairId: rawPairId, tf: rawTf, page: 1, limit: 100 },
    { skip: !showSessionsButton }
  );

  const sessionStats = React.useMemo(() => {
    const empty = { long: {} as Record<string, number>, short: {} as Record<string, number> };
    if (!dhmSessions?.length) return empty;
    return (dhmSessions as any[]).reduce((acc, s) => {
      const side: 'long' | 'short' = s.direction === 'up' ? 'long' : 'short';
      acc[side][s.status] = (acc[side][s.status] || 0) + 1;
      return acc;
    }, empty);
  }, [dhmSessions]);

  const uniqueStatuses = React.useMemo(() => {
    if (!(dhmSessions as any[])?.length) return [];
    return Array.from(new Set((dhmSessions as any[]).map((s: any) => s.status)));
  }, [dhmSessions]);

  const filteredSessions = React.useMemo(() => {
    const list = (dhmSessions as any[]) || [];
    if (sessionsTab === 'all') return list;
    return list.filter((s: any) => s.status === sessionsTab);
  }, [dhmSessions, sessionsTab]);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    if (status === 'finished') return 'success';
    if (status === 'created' || status === 'waiting' || status === 'triggered') return 'warning';
    return 'error';
  };

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
              <Avatar sx={{ mr: 1, display: { xs: 'none', sm: 'flex' } }} alt="Traken" src="/images/logo.png" />
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
                  item.url === 'tda' || item.url === 'admin' || item.url === 'arbitrage' ? (
                    <MenuItem key={item.url} onClick={() => router.replace(`/${item.url}`)}>{item.label}</MenuItem>
                  ) : item.url === 'range-xv-graph' ? (
                    <MenuItem key={item.url} onClick={() => router.replace(`/${item.url}/${pair?.id || pairs?.[0]?.id}`)}>{item.label}</MenuItem>
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
                    backgroundColor: item.isDhm ? theme.palette.primary.main : 'white',
                    color: item.isDhm ? 'white' : theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: item.isDhm ? theme.palette.primary.main : 'white',
                    }
                  }} key={item.id} onClick={() => router.replace(isRangeXv ? `/${page?.url}/${item.id}` : `/${page.url}/${item.id}/${tf.id}`)}>
                    {item.name}
                  </MenuItem>
                ))}
              </Menu>
              {!isRangeXv && (
                <>
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
                </>
              )}
              {isRangeXv && pair && rOptions.length > 0 && (
                <>
                  <Button
                    variant="text"
                    sx={{
                      '&:hover': {
                        background: 'none',
                      },
                    }}
                    aria-haspopup="true"
                    aria-expanded={openR ? 'true' : undefined}
                    onClick={handleRClick}
                  >
                    {mounted ? `R: ${r ?? rOptions[0]}` : ''}
                  </Button>
                  <Menu
                    anchorEl={anchorREl}
                    open={openR}
                    onClose={handleRClose}
                    MenuListProps={{
                      'aria-labelledby': 'basic-button',
                    }}
                  >
                    {rOptions.map((item: string) => (
                      <MenuItem
                        key={item}
                        selected={String(r) === item}
                        onClick={() => {
                          handleRClose();
                          router.replace(`/${page?.url}/${pair.id}/${item}`);
                        }}
                      >
                        {item}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}

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
          {showSessionsButton && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                size="small"
                aria-label="DHM sessions"
                onClick={(e) => setAnchorSessionsEl(e.currentTarget)}
              >
                <Iconify icon="eva:list-fill" width={22} />
              </IconButton>
              <Popover
                open={openSessions}
                anchorEl={anchorSessionsEl}
                onClose={() => setAnchorSessionsEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      width: 380,
                      maxHeight: 520,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    },
                  },
                }}
              >
                {/* Statistics */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    DHM Sessions ({(dhmSessions as any[])?.length ?? 0})
                  </Typography>
                  {Object.keys(sessionStats.long).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#4caf50', mr: 0.5 }}>Long</Typography>
                      {Object.entries(sessionStats.long).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small"
                          color={getStatusColor(status) === 'error' ? 'error' : getStatusColor(status) === 'success' ? 'success' : 'warning'}
                          variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                    </Box>
                  )}
                  {Object.keys(sessionStats.short).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#f44336', mr: 0.5 }}>Short</Typography>
                      {Object.entries(sessionStats.short).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small"
                          color={getStatusColor(status) === 'error' ? 'error' : getStatusColor(status) === 'success' ? 'success' : 'warning'}
                          variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                    </Box>
                  )}
                </Box>
                {/* Tabs */}
                <Tabs
                  value={sessionsTab}
                  onChange={(_, v) => setSessionsTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}`, minHeight: 36, flexShrink: 0 }}
                  TabIndicatorProps={{ style: { height: 2 } }}
                >
                  <Tab label={`Все (${(dhmSessions as any[])?.length ?? 0})`} value="all" sx={{ minHeight: 36, fontSize: 12, py: 0 }} />
                  {uniqueStatuses.map((status: string) => {
                    const count = ((dhmSessions as any[]) || []).filter((s: any) => s.status === status).length;
                    return (
                      <Tab key={status} value={status} sx={{ minHeight: 36, fontSize: 12, py: 0 }}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{status}</span>
                            <Chip label={count} size="small"
                              color={getStatusColor(status) === 'error' ? 'error' : getStatusColor(status) === 'success' ? 'success' : 'warning'}
                              sx={{ height: 16, fontSize: 10, '.MuiChip-label': { px: 0.75 } }} />
                          </Box>
                        }
                      />
                    );
                  })}
                </Tabs>
                {/* Sessions list */}
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                  {filteredSessions.map((item: any) => (
                    <Box
                      key={item.id}
                      onClick={() => {
                        const targetTs = item?.kline1?.ts;
                        if (!rawPairId || !targetTs) { return; }
                        setAnchorSessionsEl(null);
                        router.push(`/dhm-graph/${rawPairId}/${rawTf}?ts=${targetTs}`);
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&:last-child': { borderBottom: 0 },
                        cursor: 'pointer',
                        '&:hover': { bgcolor: theme.palette.action.hover },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: item.direction === 'up' ? '#4caf50' : '#f44336' }} />
                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled, minWidth: 28 }}>
                          #{item.id}
                        </Typography>
                        <Label color={getStatusColor(item.status)} sx={{ fontSize: 11 }}>
                          {item.status}
                        </Label>
                      </Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {moment(item.createdAt).format('MM-DD HH:mm:ss')}
                      </Typography>
                    </Box>
                  ))}
                  {!filteredSessions.length && (
                    <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: theme.palette.text.disabled }}>
                        No sessions
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Popover>
            </Box>
          )}
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
