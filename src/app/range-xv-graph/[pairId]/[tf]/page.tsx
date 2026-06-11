'use client'

import { use } from 'react';
import RangeXvGraphView from "@/src/sections/range-xv-graph/view";

export default function RangeXvGraph({ params }: any) {
  // tf is part of the route to fit the nav menu (/url/pairId/tf); Range XV is always 1s.
  const { pairId }: any = use(params);
  return (
    <RangeXvGraphView pairId={pairId} />
  )
}
