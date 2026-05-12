'use client'

import { use } from 'react';
import DzmIndexView from "@/src/sections/strategies-graph-dzm/view";

export default function DzmGraph({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <DzmIndexView pairId={pairId} tf={tf} />
  )
}
