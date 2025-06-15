'use client'

import { use } from 'react';
import ExperimentsIndexView from "@/src/sections/experiments/view";

export default function Experiments({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <ExperimentsIndexView pairId={pairId} tf={tf} />
  )
}
