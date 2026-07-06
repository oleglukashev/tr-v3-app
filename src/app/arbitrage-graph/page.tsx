'use client'

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ArbitrageGraphView from "../../sections/arbitrage-graph/view";

function ArbitrageGraphInner() {
  const params = useSearchParams();
  const name = params.get('name') || '';
  const longPairId = Number(params.get('longPairId'));
  const shortPairId = Number(params.get('shortPairId'));
  return (
    <ArbitrageGraphView
      name={name}
      longPairId={longPairId}
      shortPairId={shortPairId}
    />
  );
}

export default function ArbitrageGraph() {
  return (
    <Suspense>
      <ArbitrageGraphInner />
    </Suspense>
  );
}
