'use client'

import { use } from 'react';
import StrategiesIndexView from "../../../../sections/strategies/view";

export default function Strategies({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <AdminPairsIndexView pairId={pairId} tf={tf} />
  )
}
