'use client'

import { use } from 'react';
import DhmTestView from "@/src/sections/strategies-graph-test/view";

export default function DhmGraphTest({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <DhmTestView pairId={pairId} tf={tf} />
  )
}
