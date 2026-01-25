'use client'

import { use } from 'react';
import StrategiesIndexView from "../../../../sections/strategies-graph2/view";

export default function Strategies({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <StrategiesIndexView pairId={pairId} tf={tf} />
  )
}
