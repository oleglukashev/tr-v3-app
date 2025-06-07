'use client'

import { use } from 'react';
import CustersIndexView from "../../../../sections/clusters/view";

export default function Clusters({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <CustersIndexView pairId={pairId} tf={tf} />
  )
}
