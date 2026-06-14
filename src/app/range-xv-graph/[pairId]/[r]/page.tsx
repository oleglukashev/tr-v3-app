'use client'

import { use } from 'react';
import RangeXvGraphView from "@/src/sections/range-xv-graph/view";

export default function RangeXvGraph({ params }: any) {
  const { pairId, r }: any = use(params);
  return (
    <RangeXvGraphView pairId={pairId} r={r} />
  )
}
