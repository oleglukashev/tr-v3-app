'use client'

import { use } from 'react';
import FppIndexView from "../../../../sections/fpp/view";

export default function Fpp({ params }: any) {
  const { pairId, tf }: any = use(params);
  return (
    <FppIndexView pairId={pairId} tf={tf} />
  )
}
