'use client'

import {useCallback, useEffect, useRef, useState} from "react";
import {registerFigure, registerOverlay, registerIndicator} from "klinecharts";
import {
  useCreateDhmMutation,
  useGetAllDhmQuery, useRemoveDhmMutation, useUpdateDhmMutation, useGetAllActiveDhmQuery,
  useGetAllTestDhmQuery, useDeleteAllTestDhmMutation, useRunTestDhmMutation,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {onSubmitWrapper} from "@/src/utils/submit";
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from "@mui/icons-material/Delete";
import {StrategiesDhmSettingsDialog} from "@/src/sections/strategies-graph/strategies.dhm-settings-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph/strategies.dhm-global-settings-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph/strategies.dhm-kline-fpps-dialog";
import {StrategiesBacktestForm} from "@/src/sections/strategies-graph-test/strategies.backtest-form";
import moment from "moment/moment";
import {clearFppPatterns, drawClusterKlinesForVisible, drawFppPatterns} from "@/src/utils/klinecharts";
import { BIDASK_CLUSTER_TF, getBidasksWebSocketUrl } from "@/src/utils/bidasksWebSocket";
import MapTools from "@/src/components/map-tools/map-tools";
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";
import {
  confirmedCircle,
  ema, finishedByLoseStartKline,
  finishedStartKline,
  godKline, triggeredStartKline,
  waitingStartKline, noneditableRect, clusterKline,
  upCircleBySize, downCircleBySize, bollingerBands, createdStartKline, dhmUp, dhmDown,
  testDhmUp, testDhmDown,
  londonSession, drawLondonSessionOverlays, mintSession, drawMintSessionOverlays,
  blueSession, drawBlueSessionOverlays,
} from "@/src/helpers/klinecharts.helper";
import Map from "@/src/components/map/map";
import {useTheme} from "@mui/material/styles";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import stopPosition from "@/src/components/klinecharts-stop-position/klinecharts-stop-position";
import takePosition from "@/src/components/klinecharts-take-position/klinecharts-take-position";
import limitOrder from "@/src/components/klinecharts-limit-order/klinecharts-limit-order";
import klinechartPosition from "@/src/components/klinecharts-position/klinecharts-position";
import Label from "@/src/components/label";
import {
  //useGetQuery,
  // useCreateMutation as useCreatePositionMutation,
  // useCancelMutation as useCancelPositionMutation,
  // useUpdateMutation as useUpdatePositionMutation
} from "@/lib/redux/api/positionApi";
import {useGetAllQuery} from "@/lib/redux/api/tdaPointsApi";
import {useGetAllQuery as useGetAllOrdersQuery} from "@/lib/redux/api/orderApi";
import {useGetQuery as useGetPositionQuery} from "@/lib/redux/api/positionApi";
import {useRouter, useSearchParams} from "next/navigation";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {useGetSettingsDhmByPairIdAndTfQuery} from "@/lib/redux/api/dhmApi";

function bidaskClusterHasLevels(it: any): boolean {
  const d = it?.data;
  if (d == null || typeof d !== 'object') {
    return false;
  }
  return Object.keys(d).length > 0;
}

const DEFAULT_GLOBAL_SETTINGS = {
  fppFilters: [
    'interception',
    'reverse',
    'locked_volume',
    'locked_delta',
    'locked_imbalance',
    'test_volume',
    'resistance',
    'weakness',
    'low_last_price_volume',
    //'tda'
  ],
  statusFilters: [
    'created',
    'waiting',
    'triggered',
    'finished',
    'finished_by_size',
    'finished_by_lose',
    'finished_by_trend_finish'
  ],
  fppCombine: false,
  showLiquidity: true,
  showBidasks: true,
  showSessions: true,
  showVolume: true,
  showDrawingElements: true,
  dhmVisibleStatuses: ['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_size'],
};

registerOverlay(confirmedCircle);
registerOverlay(finishedStartKline);
registerOverlay(triggeredStartKline);
registerOverlay(finishedByLoseStartKline);
registerOverlay(waitingStartKline);
registerOverlay(createdStartKline);
registerOverlay(rect);
registerOverlay(noneditableRect);
registerOverlay(clusterKline());
registerOverlay(londonSession);
registerOverlay(mintSession);
registerOverlay(blueSession);
registerOverlay(limitOrder(async () => {}));
registerOverlay(klinechartPosition(async () => {}));
registerOverlay(stopPosition(async () => {}));
registerOverlay(takePosition(() => {}));
registerOverlay(dhmUp);
registerOverlay(dhmDown);
registerOverlay(testDhmUp);
registerOverlay(testDhmDown);
registerIndicator(ema);
registerIndicator(bollingerBands);
registerFigure(godKline);

export default function DhmIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const router = useRouter();
  let searchParams = useSearchParams();
  const SETTINGS_STORAGE_KEY = 'dhmGraphGlobalSettings';
  const LEGACY_PAIR_SETTINGS_STORAGE_KEY = `settings${pairId}`;
  const LEGACY_FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [klinesUpdatedAt, setKlinesUpdatedAt] = useState<number | null>(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openChartSettings, setOpenChartSettings] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const [isDhmSidebarOpen, setIsDhmSidebarOpen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(320);
  const [testSessionsTab, setTestSessionsTab] = useState('all');
  const [testSessionsPage, setTestSessionsPage] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(320);
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentDhmKline, setCurrentDhmKline] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const [currentTestSession, setCurrentTestSession] = useState(null);
  const { mapDrawingOverlayActiveRef, onDrawingInteractionChange } = useMapDrawingOverlayRef();
  const [globalSettings, setGlobalSettings] = useState<any>(DEFAULT_GLOBAL_SETTINGS);
  const {
    fppFilters,
    statusFilters,
    fppCombine,
    showLiquidity,
    showBidasks: showBidasksSetting,
    showSessions,
    showVolume,
    showDrawingElements,
    dhmVisibleStatuses,
  } = globalSettings;
  const showBidasks = showBidasksSetting ?? showLiquidity ?? true;
  const getLimitOrderPrice = useCallback((order: any, level: any) => {
    const candidates = [
      order?.data?.price,
      order?.price,
      order?.limitPrice,
      level,
    ];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return null;
  }, []);
  //const { data: klines } = useGetAllKlinesQuery({ pairId, page, limit: 5000, tf });
  const [bidaskClustersByTs, setBidaskClustersByTs] = useState<Record<string, any>>({});
  const [heatmapTick, setHeatmapTick] = useState(0);

  const onBidasksChunk = useCallback((items: any[]) => {
    setBidaskClustersByTs((prev) => {
      const next = { ...prev };
      for (const it of items) {
        const key = String(it.ts);
        const merged = { ...it, ts: key };
        // Later / overlapping fetches often return [] or empty `data` for the same ts; do not wipe a good cluster.
        if (!bidaskClusterHasLevels(merged) && bidaskClusterHasLevels(prev[key])) {
          continue;
        }
        next[key] = merged;
      }
      return next;
    });
    setHeatmapTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setBidaskClustersByTs({});
  }, [pairId, tf]);

  useEffect(() => {
    if (!showBidasks || pairId == null) {
      return;
    }
    const wsUrl = getBidasksWebSocketUrl();
    let socket: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      if (cancelled) {
        return;
      }
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }
      socket.onopen = () => {
        socket?.send(
          JSON.stringify({
            type: 'subscribeBidasksByPairIdAndTf',
            pairId: Number(pairId),
            tf: BIDASK_CLUSTER_TF,
          }),
        );
      };
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type !== 'bidasks' || !Array.isArray(msg.data)) {
            return;
          }
          const items = msg.data.filter(
            (b: any) =>
              Number(b.pairId) === Number(pairId) && Number(b.tf) === BIDASK_CLUSTER_TF,
          );
          if (!items.length) {
            return;
          }
          onBidasksChunk(items);
        } catch {
          /* ignore */
        }
      };
      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [showBidasks, pairId, onBidasksChunk]);
  const { data: dhmSettings } = useGetSettingsDhmByPairIdAndTfQuery({ tf, pairId });
  //const { data: position, refetch: refetchPosition } = useGetQuery(pairId);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 5000, tf });
  const { data: dhm } = useGetAllDhmQuery(
    { pairId, tf: 60, statusFilters },
  );
  const { data: dhmSidebarItems } = useGetAllActiveDhmQuery({ });
  const { data: testSessions, refetch: refetchTestSessions } = useGetAllTestDhmQuery({ pairId, tf }, { skip: !isTestPanelOpen });
  const [deleteAllTestSessions, { isLoading: isDeletingTest }] = useDeleteAllTestDhmMutation();
  const [runTest, { isLoading: isRunningTest }] = useRunTestDhmMutation();
  const { data: tdaPoints } = useGetAllQuery({ pairId });
  //const [createPositionRtk, { isLoading: isCreatePositionLoading }] = useCreatePositionMutation();
  //const [cancelPositionRtk, { isLoading: isCancelPositionLoading }] = useCancelPositionMutation();
  //const [updatePositionRtk, { isLoading: isUpdatePositionLoading }] = useUpdatePositionMutation();
  const [create, { isLoading: isCreateLoading }] = useCreateDhmMutation();
  const [update, { isLoading: isUpdateLoading }] = useUpdateDhmMutation();
  const [remove, { isLoading }] = useRemoveDhmMutation();
  const { data: orders } = useGetAllOrdersQuery({ pairId, status: 'open' });
  const { data: position } = useGetPositionQuery({ pairId });

  const onSaveGlobalSettingsSubmit = useCallback(async (values: any) => {
    const nextSettings = {
      fppFilters: values.fppFilters,
      statusFilters: values.statusFilters,
      fppCombine: !!values.fppCombine,
      showLiquidity: !!values.showLiquidity,
      showBidasks: !!values.showBidasks,
      showSessions: !!values.showSessions,
      showVolume: values.showVolume !== false,
      showDrawingElements: values.showDrawingElements !== false,
      dhmVisibleStatuses: values.dhmVisibleStatuses || [],
    };
    setGlobalSettings(nextSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      } catch {}
    }
    setOpenChartSettings(false);
    clearFppPatterns(chart);
    drawFppPatterns(chart, chart.getDataList(), fpp, (tdaPoints || []), nextSettings.fppFilters, nextSettings.fppCombine);
  }, [SETTINGS_STORAGE_KEY, chart, fpp, tdaPoints]);

  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
        || localStorage.getItem(LEGACY_PAIR_SETTINGS_STORAGE_KEY)
        || localStorage.getItem(LEGACY_FPP_FILTERS_STORAGE_KEY);
      if (!saved) { return; }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        const nextSettings = {
          ...DEFAULT_GLOBAL_SETTINGS,
          fppFilters: parsed,
        };
        setGlobalSettings(nextSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        return;
      }
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.filters)) {
          const nextSettings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            fppFilters: parsed.filters,
            fppCombine: !!parsed.combine,
          };
          setGlobalSettings(nextSettings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
          return;
        }
        if (Array.isArray(parsed.fppFilters) || Array.isArray(parsed.statusFilters)) {
          const nextSettings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            ...parsed,
            fppCombine: !!parsed.fppCombine,
            showBidasks:
              parsed.showBidasks ?? parsed.showLiquidity ?? DEFAULT_GLOBAL_SETTINGS.showBidasks,
          };
          setGlobalSettings(nextSettings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        }
      }
    } catch {}
  }, [SETTINGS_STORAGE_KEY, LEGACY_PAIR_SETTINGS_STORAGE_KEY, LEGACY_FPP_FILTERS_STORAGE_KEY]);

  useEffect(() => {
    const onOpenChartSettings = () => {
      setOpenChartSettings(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('open-chart-settings-dialog', onOpenChartSettings);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chart-settings-dialog', onOpenChartSettings);
      }
    };
  }, []);

  const onCreateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => create(values), (data) => {
      if (data.data) {
        setCurrentDhm(data.data);
      }
    }, 'Успешно создано');
  }, []);

  const onUpdateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => update({ id: currentDhm.id, values }), null, 'Успешно создано');
  }, [currentDhm?.id, update]);

  const onRemoveSubmit = useCallback(async () => {
    return onSubmitWrapper(() => remove(currentDhm?.id), (data: any) => {
      if (!data?.data) {
        setCurrentDhm(null);
        setCurrentDhmKline(null);
        setCurrentClusterKline(null);
      }
    }, 'Успешно удалено');
  }, [currentDhm?.id, remove]);

  const onDhmSidebarItemClick = useCallback((item: any) => {
    setCurrentDhm(item);
    const targetPairId = item?.pairId;
    const targetTs = item?.kline1Ts ?? item?.kline1?.ts;
    if (!targetPairId || !targetTs) { return; }
    router.push(`/dhm-graph/${targetPairId}/60?ts=${targetTs}`);
  }, [router]);

  const onClearTestResults = useCallback(async () => {
    await deleteAllTestSessions({});
    refetchTestSessions();
  }, [deleteAllTestSessions, refetchTestSessions]);

  const onRunTestSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => runTest({ pairId, tf, ...values }), () => refetchTestSessions(), 'Запущено');
  }, [runTest, pairId, tf, refetchTestSessions]);

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = dragStartY.current - ev.clientY;
      setPanelHeight(Math.max(120, Math.min(window.innerHeight * 0.85, dragStartHeight.current + delta)));
    };
    const onMouseUp = () => {
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight]);

  const setDataLoaderCallback = useCallback(() => {
    if (!klinesUpdatedAt) {
      setKlinesUpdatedAt(moment().utc().valueOf());
    }
    // Redraw bidask cluster columns after klines apply; delayed tick catches restoreSavedZoom (~60ms) in Map.
    setHeatmapTick((t) => t + 1);
    window.setTimeout(() => setHeatmapTick((t) => t + 1), 160);
    if (fpp && drawFppPatterns) {
      const klines = chart.getDataList();
      drawFppPatterns(chart, klines, fpp, (tdaPoints || []), fppFilters, fppCombine);
    }
  }, [klinesUpdatedAt, fpp, chart, tdaPoints, fppFilters, fppCombine])

  useEffect((): void => {
    if (!chart) { return; }
    if (!fpp?.length) { return; }
    if (!dhm?.length) { return; }
    const klines = chart.getDataList();
    if (!klines?.length) { return }
    clearFppPatterns(chart);
    drawFppPatterns(chart, klines, fpp, (tdaPoints || []), fppFilters, fppCombine);
  }, [chart, dhm, fpp, tdaPoints, fppFilters, fppCombine, klinesUpdatedAt]);

  useEffect(() => {
    if (!chart) { return; }
    const bumpClusterOverlays = () => setHeatmapTick((t) => t + 1);
    chart.subscribeAction?.('onZoom', bumpClusterOverlays);
    chart.subscribeAction?.('onScroll', bumpClusterOverlays);
    return () => {
      chart.unsubscribeAction?.('onZoom', bumpClusterOverlays);
      chart.unsubscribeAction?.('onScroll', bumpClusterOverlays);
    };
  }, [chart]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showBidasks) {
      chart.removeOverlay({ name: 'clusterKline' });
      return;
    }
    drawClusterKlinesForVisible(chart, bidaskClustersByTs);
  }, [chart, klinesUpdatedAt, bidaskClustersByTs, showBidasks, heatmapTick]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showSessions) {
      chart.removeOverlay({ name: 'londonSession' });
      chart.removeOverlay({ name: 'mintSession' });
      chart.removeOverlay({ name: 'blueSession' });
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return; }
    drawLondonSessionOverlays(chart, klines);
    drawMintSessionOverlays(chart, klines);
    drawBlueSessionOverlays(chart, klines);
  }, [chart, klinesUpdatedAt, showSessions]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showVolume) {
      chart.removeIndicator('vol_pane', 'VOL');
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return; }
    chart.createIndicator('VOL', false, { id: 'vol_pane', height: 80 });
    chart.overrideIndicator({
      name: 'VOL',
      styles: {
        lines: [
          { color: 'transparent' },
          { color: 'transparent' },
          { color: 'transparent' },
        ],
      },
    }, 'vol_pane');
  }, [chart, klinesUpdatedAt, showVolume]);

  useEffect(() => {
    if (!chart) {return}
    if (!dhm) {return}

    chart.removeOverlay({ name: `dhmUp` })
    chart.removeOverlay({ name: `dhmDown` })
    chart.removeOverlay({ name: `limitOrder` })

    if (!isTestPanelOpen) {
      for (const item of dhm) {
        if (!(dhmVisibleStatuses || []).includes(item.status)) { continue; }
        chart.createOverlay({
          name: item.direction === 'up' ? 'dhmUp' : 'dhmDown',
          extendData: {
            ts: item.direction === 'up' ? item.kline1.low : item.kline1.high,
            confirmed: item.confirmed,
            tf: item.tf,
            status: item.status,
          },
          points: [{timestamp: parseInt(item.kline1.ts), value: parseFloat(item.direction === 'up' ? item.kline1.low : item.kline1.high)}],
        })

        if (
          ['up', 'down'].includes(item?.direction)
          && ['triggered', 'waiting'].includes(item?.status)
          && item?.orders
          && typeof item.orders === 'object'
        ) {
          for (const side of Object.keys(item.orders)) {
            const sideOrders = item.orders[side];
            if (!sideOrders || typeof sideOrders !== 'object') { continue; }
            for (const level of Object.keys(sideOrders)) {
              const order = sideOrders[level];
              if (!order?.id || order?.status !== 'success') { continue; }
              const limitOrderPrice = getLimitOrderPrice(order, level);
              if (!limitOrderPrice) { continue; }
              chart.createOverlay({
                name: `limitOrder`,
                points: [{ timestamp: null, value: limitOrderPrice }],
              });
            }
          }
        }
      }
    }

    const onCandleBarClick = async (event: any) => {
      const bar = chart.getBarSpace();
      const { data } = event;
      if (bar.bar >= 25) {
        return;
      }
      if (mapDrawingOverlayActiveRef.current) {
        return;
      }
      if (isTestPanelOpen) {
        const testSession = (testSessions || []).find(
          (item: any) => Number(item.data?.kline1?.ts) === Number(data.current.timestamp),
        );
        if (testSession) {
          setCurrentTestSession(testSession);
        }
        return;
      }
      setCurrentDhmKline(data.current);
      const currentDhm = dhm.find((item: any) => Number(item.kline1.ts) === Number(data.current.timestamp));
      setCurrentDhm(currentDhm);
    };
    const onZoom = (e: any) => {
      const bar = chart.getBarSpace();
      if (bar.bar < 25) {
        chart.removeOverlay({ name: 'clusterKline' });
        setCurrentClusterKline(null);
      }
    };
    chart.subscribeAction('onCandleBarClick', onCandleBarClick);
    chart.subscribeAction('onZoom', onZoom);
    return () => {
      chart.unsubscribeAction?.('onCandleBarClick', onCandleBarClick);
      chart.unsubscribeAction?.('onZoom', onZoom);
    };
  }, [chart, fpp, dhm, dhmVisibleStatuses, getLimitOrderPrice, mapDrawingOverlayActiveRef, isTestPanelOpen, testSessions]);

  useEffect((): void => {
    if (!chart) { return; }
    chart.removeOverlay({ name: 'testDhmUp' });
    chart.removeOverlay({ name: 'testDhmDown' });
    if (!isTestPanelOpen || !testSessions?.length) { return; }
    for (const item of testSessions) {
      const kline1 = item.data?.kline1;
      if (!kline1) { continue; }
      chart.createOverlay({
        name: item.direction === 'up' ? 'testDhmUp' : 'testDhmDown',
        extendData: {
          ts: item.direction === 'up' ? kline1.low : kline1.high,
          tf: item.tf,
          status: item.status,
        },
        points: [{ timestamp: parseInt(kline1.ts), value: parseFloat(item.direction === 'up' ? kline1.low : kline1.high) }],
      });
    }
  }, [chart, isTestPanelOpen, testSessions]);


  useEffect(() => {
    for (const item of [1,2,3,4,5,6,7]) {
      registerOverlay(
        upCircleBySize(item, (e) => {
          setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
          setOpenKlineFpp(true);
          return true;
        }),
      );
      registerOverlay(
        downCircleBySize(item, (e) => {
          setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
          setOpenKlineFpp(true);
          return true;
        }),
      );
    }
  }, [fpp]);

  return (
    <main style={{ position: 'relative' }}>
      <Map
        pairId={pairId}
        tf={tf}
        defaultTs={searchParams.get('ts')}
        setParentChart={setChart}
        //setCurrentPrice={setCurrentPrice}
        updateWebsocketPriceCallback={() => {
          //drawCreatePosition();
        }}
        setDataLoaderCallback={setDataLoaderCallback}
        onBidasksChunk={onBidasksChunk}
        enableBidasksClusters={showBidasks}
      />

      <IconButton key='settings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${112}px`,
        background: theme.palette.grey[200],
        '&:hover': {
          background: theme.palette.grey[300],
        }
      }} aria-label="delete" onClick={() => {
        setOpenSettings(true);
      }}>
        <SettingsIcon />
      </IconButton>

      <MapTools
        chart={chart}
        pairId={pairId}
        tf={tf}
        showDrawingElements={showDrawingElements}
        onDrawingInteractionChange={onDrawingInteractionChange}
      />

      {!isDhmSidebarOpen && (
        <Button
          variant="contained"
          size="small"
          onClick={() => setIsDhmSidebarOpen(true)}
          sx={{
            position: 'absolute',
            zIndex: 2,
            right: '-13px',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            top: '100px',
            transform: 'rotate(-90deg)',
            minWidth: 44,
            px: 1.5,
          }}
        >
          DHM
        </Button>
      )}

      <Drawer
        variant="persistent"
        anchor="right"
        open={isDhmSidebarOpen}
        sx={{
          '& .MuiDrawer-paper': {
            width: 312,
            p: 2,
            overflowY: 'auto',
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsDhmSidebarOpen(false)}
          sx={{ mb: 1.5 }}
        >
          Hide
        </Button>

        <Typography variant="h6" sx={{ mb: 1.5 }}>
          DHM items
        </Typography>

        <List dense sx={{ mb: 1 }}>
          {(dhmSidebarItems || []).map((item: any) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton onClick={() => onDhmSidebarItemClick(item)}>
                <ListItemText
                  primary={(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: item.direction === 'down'
                            ? theme.palette.error.main
                            : theme.palette.success.main,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {`Pair: ${item.pairId} (${moment(Number(item?.kline1?.ts)).format('DD.MM.YYYY HH:mm')})`}
                    </span>
                  )}
                />
                <Label color={'success'}>{item.status}</Label>
              </ListItemButton>
            </ListItem>
          ))}
          {!dhmSidebarItems?.length && (
            <ListItem>
              <ListItemText primary="No items" />
            </ListItem>
          )}
        </List>
      </Drawer>

      <CustomDialog
        open={currentDhmKline}
        onClose={() => setCurrentDhmKline(null)}
        title={(
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{`Kline ${currentDhmKline?.timestamp}`}</span>
            {!!currentDhm && (
              <IconButton aria-label="delete" onClick={onRemoveSubmit} size="small">
                <DeleteIcon />
              </IconButton>
            )}
          </div>
        )}
        content={(
          <StrategiesDhmDialog
            currentDhm={currentDhm}
            currentKline={currentDhmKline}
            onCreateSubmit={onCreateSubmit}
            onUpdateSubmit={onUpdateSubmit}
            onRemoveSubmit={onRemoveSubmit}
            tf={tf}
            pairId={pairId}
            currentPrice={null}
            dhmSettings={dhmSettings}
          />
        )}
      />

      <CustomDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title={`Settings`}
        content={(
          <StrategiesDhmSettingsDialog dhmSettings={dhmSettings} tf={tf} pairId={pairId} />
        )}
      />

      <CustomDialog
        open={openChartSettings}
        onClose={() => setOpenChartSettings(false)}
        title={`Chart settings`}
        content={(
          <StrategiesDhmFppFiltersDialog settings={globalSettings} onSubmit={onSaveGlobalSettingsSubmit} />
        )}
      />

      <CustomDialog
        open={openKlineFpp}
        onClose={() => setOpenKlineFpp(false)}
        title={`Kline Fpp`}
        content={(
          <StrategiesDhmKlineFppsDialog fpp={currentKlineFpp} />
        )}
      />

      <CustomDialog
        open={!!currentTestSession}
        onClose={() => setCurrentTestSession(null)}
        title={`Test session #${currentTestSession?.id}`}
        content={(
          currentTestSession && (
            <StrategiesDhmDialog
              currentDhm={{
                ...currentTestSession,
                high: currentTestSession.data?.high,
                low: currentTestSession.data?.low,
                kline1: currentTestSession.data?.kline1,
                kline2: currentTestSession.data?.kline2,
              }}
              currentKline={null}
              onCreateSubmit={null}
              onUpdateSubmit={() => {}}
              onRemoveSubmit={() => {}}
              tf={tf}
              pairId={pairId}
              currentPrice={null}
              dhmSettings={dhmSettings}
            />
          )
        )}
      />

      {!isTestPanelOpen && (
        <Button
          variant="contained"
          size="small"
          onClick={() => setIsTestPanelOpen(true)}
          sx={{
            position: 'fixed',
            zIndex: 2,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            minWidth: 80,
            px: 2,
          }}
        >
          Test
        </Button>
      )}

      <Drawer
        variant="persistent"
        anchor="bottom"
        open={isTestPanelOpen}
        sx={{
          '& .MuiDrawer-paper': {
            height: panelHeight,
            left: 0,
            right: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 'lg',
            p: 2,
            pt: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderLeft: `1px solid ${theme.palette.divider}`,
            borderRight: `1px solid ${theme.palette.divider}`,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          onMouseDown={onDragHandleMouseDown}
          sx={{
            height: 20,
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mb: 0.5,
            userSelect: 'none',
          }}
        >
          <Box sx={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.palette.divider }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexShrink: 0 }}>
          <Button variant="outlined" size="small" onClick={() => setIsTestPanelOpen(false)}>
            Hide
          </Button>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Test sessions
          </Typography>
          <Button
            variant="contained"
            size="small"
            color="error"
            disabled={isDeletingTest}
            onClick={onClearTestResults}
          >
            Clear results
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          <Box sx={{ width: 340, flexShrink: 0, overflowY: 'auto' }}>
            <StrategiesBacktestForm
              defaultValues={{
                pairId,
                tf,
                enterLevel1: '0.5',
                enterLevel2: '0.618',
                enterLevel3: '0.768',
                takeProfitLevel1: '0.382',
                takeProfitLevel2: '0.5',
                takeProfitLevel3: '0.618',
                triggerLevel: '0.5',
                stopLossLevel: '1.1',
                finishLevel: '0.382',
                maxSessionLength: 60,
                minPriceSize: 5,
                startTs: 1767211200000,
                finishTs: null,
                direction: 'up',
              }}
              isLoading={isRunningTest}
              onSubmit={onRunTestSubmit}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {(() => {
            const sessions = (testSessions as any[]) || [];
            const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' =>
              status === 'finished' || status === 'finished_by_size' ? 'success'
              : status === 'finished_by_lose' || status === 'finished_by_length' ? 'error'
              : status === 'created' || status === 'waiting' || status === 'triggered' ? 'warning'
              : 'default';
            const stats = sessions.reduce(
              (acc: any, s: any) => {
                const side = s.direction === 'up' ? 'long' : 'short';
                acc[side][s.status] = (acc[side][s.status] || 0) + 1;
                return acc;
              },
              { long: {} as Record<string, number>, short: {} as Record<string, number> },
            );
            const uniqueStatuses = Array.from(new Set(sessions.map((s: any) => s.status))) as string[];
            const filteredSessions = testSessionsTab === 'all' ? sessions : sessions.filter((s: any) => s.status === testSessionsTab);
            const PAGE_SIZE = 50;
            const pageCount = Math.ceil(filteredSessions.length / PAGE_SIZE);
            const pageSessions = filteredSessions.slice(testSessionsPage * PAGE_SIZE, (testSessionsPage + 1) * PAGE_SIZE);
            return (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Stats */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Test Sessions ({sessions.length})
                  </Typography>
                  {Object.keys(stats.long).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#4caf50', mr: 0.5 }}>Long</Typography>
                      {Object.entries(stats.long).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small" color={getStatusColor(status) as any} variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                    </Box>
                  )}
                  {Object.keys(stats.short).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#f44336', mr: 0.5 }}>Short</Typography>
                      {Object.entries(stats.short).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small" color={getStatusColor(status) as any} variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                    </Box>
                  )}
                </Box>
                {/* Tabs */}
                <Tabs
                  value={testSessionsTab}
                  onChange={(_, v) => { setTestSessionsTab(v); setTestSessionsPage(0); }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}`, minHeight: 36, flexShrink: 0 }}
                  TabIndicatorProps={{ style: { height: 2 } }}
                >
                  <Tab label={`All (${sessions.length})`} value="all" sx={{ minHeight: 36, fontSize: 12, py: 0 }} />
                  {uniqueStatuses.map((status) => {
                    const count = sessions.filter((s: any) => s.status === status).length;
                    return (
                      <Tab key={status} value={status} sx={{ minHeight: 36, fontSize: 12, py: 0 }}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{status}</span>
                            <Chip label={count} size="small" color={getStatusColor(status) as any}
                              sx={{ height: 16, fontSize: 10, '.MuiChip-label': { px: 0.75 } }} />
                          </Box>
                        }
                      />
                    );
                  })}
                </Tabs>
                {/* Sessions list */}
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                  {pageSessions.map((item: any) => (
                    <Box
                      key={item.id}
                      onClick={() => {
                        const targetTs = item?.data?.kline1?.ts ?? item?.startTs;
                        if (!pairId || !targetTs) { return; }
                        router.push(`/dhm-graph/${pairId}/${tf}?ts=${targetTs}`);
                      }}
                      sx={{
                        px: 2, py: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
                        {moment(Number(item.startTs)).format('MM-DD HH:mm')}
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
                {/* Pagination */}
                {pageCount > 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 0.75, borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
                    <Button size="small" disabled={testSessionsPage === 0} onClick={() => setTestSessionsPage(p => p - 1)}>Prev</Button>
                    <Typography variant="caption">{testSessionsPage + 1} / {pageCount}</Typography>
                    <Button size="small" disabled={testSessionsPage >= pageCount - 1} onClick={() => setTestSessionsPage(p => p + 1)}>Next</Button>
                  </Box>
                )}
              </Box>
            );
          })()}
        </Box>
      </Drawer>
    </main>
  )
}
