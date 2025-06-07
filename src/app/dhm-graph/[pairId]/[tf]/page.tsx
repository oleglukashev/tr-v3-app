'use client'

import { use } from 'react';
import DhmIndexView from "@/src/sections/strategies-graph/view";

export default function DhmGraph({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <DhmIndexView pairId={pairId} tf={tf} />
  )
}
