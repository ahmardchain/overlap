// Adapted from Spectrum UI's app/registry/charts/line-chart.tsx (Apache-2.0).
// Changes: arbitrary asset series, date axis, shared-observation gaps, Overlap CSS.
import * as React from 'react';
import {CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea} from 'recharts';
import {ChartFrame, ChartPlotSurface, ChartActiveDot, ChartTooltipContent, chartGrid, chartXAxis, chartYAxis, RevealMask, useChartId, useChartMotion, useIntroStartedAt} from './chart-kit';
export function OverlapLineChart({data,assets,interval,formatDate}) {
 const id=useChartId('overlap');const {reduce}=useChartMotion();const introStartedAt=useIntroStartedAt();const maskId=`${id}-reveal`;
 return <ChartFrame className="chart"><ChartPlotSurface><ResponsiveContainer width="100%" height="100%">
  <RechartsLineChart data={data} margin={{top:12,right:10,left:0,bottom:16}} accessibilityLayer>
   <defs><RevealMask id={maskId} introStartedAt={introStartedAt} reduce={reduce}/></defs>
   <CartesianGrid {...chartGrid}/>
   <XAxis {...chartXAxis} dataKey="index" type="number" domain={[0,Math.max(1,data.length-1)]} ticks={data.filter((_,i)=>i%(interval==='Weekly'?2:14)===0).map(r=>r.index)} tickFormatter={i=>data[i]?formatDate(data[i].date):''}/>
   <YAxis {...chartYAxis} domain={["auto","auto"]}/>
   <Tooltip cursor={{stroke:'currentColor',strokeOpacity:.22,strokeDasharray:'4 4'}} content={props=><ChartTooltipContent {...props} label={data[Number(props.label)]?formatDate(data[Number(props.label)].date)+' · Index':undefined}/>}/>
   {data.filter(r=>r.missing).map(r=><ReferenceArea key={r.index} x1={r.index-.45} x2={r.index+.45} fill="#ba6248" fillOpacity={.075} strokeOpacity={0}/>)}
   {assets.map((a,i)=><Line key={a.id} type="linear" dataKey={a.id} name={a.symbol} stroke={a.color} strokeWidth={2.25} strokeDasharray={i===1?'5 5':i===2?'2 5':undefined} dot={false} activeDot={props=><ChartActiveDot key={`active-${props.index}`} cx={props.cx} cy={props.cy} color={a.color}/>} connectNulls={false} isAnimationActive={false} style={reduce?undefined:{mask:`url(#${maskId})`}}/>)}
  </RechartsLineChart>
 </ResponsiveContainer></ChartPlotSurface></ChartFrame>
}
