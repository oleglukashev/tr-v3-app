import Box from "@mui/material/Box";
import {StrategiesBacktestForm} from "@/src/sections/strategies-graph/strategies.backtest-form";
import {useCallback, useEffect, useMemo, useState} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {useDeleteAllTestMutation, useGetAllTestQuery, useRunMutation} from "@/lib/redux/api/dhmApi";
import Button from "@mui/material/Button";
import {dispose, init} from "klinecharts";
import {camelCase} from "lodash";
import ReorderIcon from "@mui/icons-material/Reorder";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import {IconButton} from "@mui/material";

export function StrategiesDhmBacktestDialog({ pairId, tf, klines }: any) {
  const [chart, setChart] = useState<any>(null);
  const [run, { isLoading }] = useRunMutation();
  const [removeAllTest, { isLoading: isRemovalAllLoading }] = useDeleteAllTestMutation();
  const { data: testDhm } = useGetAllTestQuery({ pairId, tf });
  const onRunSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => run({ pairId, tf, ...values }), null, 'Успешно запущенно');
  }, [pairId, tf]);
  const onDeleteAllTestSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => removeAllTest({ pairId, tf, ...values }), null, 'Успешно удалено');
  }, [pairId, tf]);

  useEffect(() => {
    const chart = init('chartBacktest', {
      // layout: [
      //   { type: 'indicator', content: ['VOL'], options: { order: 10 }  },
      // ]
    });
    setChart(chart);
    chart.setPrecision({ price: 5 })
    return () => {
      dispose('chartBacktest')
    }
  }, [])

  useEffect(() => {
    if (!klines) { return }
    if (!testDhm) {return}
    if (!chart) {return}
    chart.applyNewData(klines.map((item: any) => {
      // Создаем графическую метку
      return {
        ...item,
        timestamp: parseInt(item.ts),
        volume: parseInt(item.volume),
      }
    }))

    for (const item of testDhm) {
      if (['waiting', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: `${camelCase(item.status)}StartKline`,
          points: [{timestamp: parseInt(item.data.kline1.ts), value: parseFloat(item.data.kline1.close)}],
        })
      }
    }
    chart.subscribeAction('onCandleBarClick', (event) => {
      const { data, x, y } = event
      const currentDhm = testDhm.find(item => item.data.kline1.id === data.current.id);
      console.log(currentDhm);
    })
  }, [chart, klines, testDhm]);

  const data = useMemo(() => {
    if (!testDhm?.length) { return }
    return {
      count: testDhm.length,
      created: testDhm.filter(item => item.status === 'created').length,
      finished: testDhm.filter(item => item.status === 'finished').length,
      triggered: testDhm.filter(item => item.status === 'triggered').length,
      waiting: testDhm.filter(item => item.status === 'waiting').length,
      finishedBySize: testDhm.filter(item => item.status === 'finished_by_size').length,
      finishedByLose: testDhm.filter(item => item.status === 'finished_by_lose').length,
      finishedByLength: testDhm.filter(item => item.status === 'finished_by_length').length,
      closedByLength: testDhm.filter(item => item.status === 'closed_by_length').length
    }
  }, [testDhm]);

  return (
    <Box sx={{p: 2}}>
      <div id="chartBacktest" style={{width: '100%', height: 450}}/>
      <Box>Total: {data?.count}</Box>
      <Box>Created: {data?.created}</Box>
      <Box>Triggered: {data?.triggered}</Box>
      <Box>Waiting: {data?.waiting}</Box>
      <Box>Finished: {data?.finished}</Box>
      <Box>Finished by lose: {data?.finishedByLose}</Box>
      <Box>Finished by size: {data?.finishedBySize}</Box>
      <Box>Closed by length: {data?.closedByLength}</Box>
      <Box sx={{mb: 2}}>Finished by length: {data?.finishedByLength}</Box>
      <StrategiesBacktestForm
        defaultValues={{
          pairId,
          tf,
          exitLevel: '1.618',
          maxSessionLength: 60,
          minPriceSize: 0.5,
          startTs: 1704052812000,
        }}
        isLoading={isLoading}
        onSubmit={onRunSubmit}
      />
      <Button color='error' fullWidth variant='contained' onClick={onDeleteAllTestSubmit}>Remove backtest</Button>

      {[
        { name: 'fibonacciLine2', icon: ReorderIcon },
        { name: 'priceLine', icon: LinearScaleIcon },
        { name: 'rayLine', icon: HorizontalRuleIcon },
      ].map((item, index) => (
        <IconButton key={item.name} sx={{
          position: 'absolute',
          zIndex: 1,
          left: '18px',
          bottom: `${index * 45 + 65}px`,
          background: '#ececec',
        }} aria-label="delete" onClick={() => {
          chart.createOverlay(item.name);
        }}>
          <item.icon />
        </IconButton>
      ))}
    </Box>
  )
}
