'use client'

import { use } from 'react';
import DhmTestView from "@/src/sections/strategies-graph-test2/view";

export default function Dhm2GraphTest({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <DhmTestView pairId={pairId} tf={tf} />
  )
}

