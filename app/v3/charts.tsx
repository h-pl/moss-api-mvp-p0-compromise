"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const colors = { ink: "#171717", green: "#168653", orange: "#f1782c", red: "#c8464f", gray: "#a7adb1" };
const tooltipStyle = { border: "1px solid #dfe1e2", borderRadius: 8, boxShadow: "0 10px 28px #00000012", fontSize: 11 };

export function RequestVolumeChart({data}:{data:{time:string;success:number;client:number;service:number}[]}){
 return <div className="chart-canvas" aria-label="请求量与状态分布图"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:10,left:-14,bottom:0}}><defs><linearGradient id="requestSuccess" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.ink} stopOpacity={.18}/><stop offset="100%" stopColor={colors.ink} stopOpacity={.01}/></linearGradient></defs><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10}}/><Area name="成功请求" type="monotone" dataKey="success" stroke={colors.ink} strokeWidth={2} fill="url(#requestSuccess)"/><Area name="客户侧 4xx" type="monotone" dataKey="client" stroke={colors.orange} fill="none" strokeWidth={1.6}/><Area name="服务方 5xx" type="monotone" dataKey="service" stroke={colors.red} fill="none" strokeWidth={1.6}/></AreaChart></ResponsiveContainer></div>
}

export function AvailabilityChart({data,target=99,targetLabel="合同目标 99%"}:{data:{date:string;availability:number;success:number;p95:number}[];target?:number;targetLabel?:string}){
 return <div className="chart-canvas" aria-label="服务可用性趋势图"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:10,left:-4,bottom:0}}><defs><linearGradient id="availabilityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.green} stopOpacity={.22}/><stop offset="100%" stopColor={colors.green} stopOpacity={.01}/></linearGradient></defs><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis domain={[98.9,100]} ticks={[99,99.5,100]} tickFormatter={v=>`${v}%`} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><Tooltip formatter={(value)=>[`${Number(value).toFixed(3)}%`,"服务可用性"]} contentStyle={tooltipStyle}/><ReferenceLine y={target} stroke={colors.orange} strokeDasharray="4 4" label={{value:targetLabel,fontSize:10,fill:colors.orange,position:"insideBottomRight"}}/><Area type="monotone" dataKey="availability" stroke={colors.green} strokeWidth={2.2} fill="url(#availabilityFill)"/></AreaChart></ResponsiveContainer></div>
}

export function LatencyBars({data}:{data:{name:string;value:number}[]}){
 return <div className="chart-canvas compact" aria-label="时延分位图"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:8,right:12,left:0,bottom:0}}><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis width={58} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}} unit=" ms"/><Tooltip formatter={(value)=>[`${value} ms`,"端到端时延"]} contentStyle={tooltipStyle}/><Bar dataKey="value" radius={[5,5,0,0]}>{data.map((_,index)=><Cell key={index} fill={index===data.length-1?colors.orange:colors.ink}/>)}</Bar></BarChart></ResponsiveContainer></div>
}

export function UsageAreaChart({data,unit="M 字符",metricLabel}:{data:{date:string;usage:number;requests:number;cost:number}[];unit?:string;metricLabel?:string}){
 const isCurrency=unit.includes("元")||unit.includes("¥");
 const isPoints=unit.includes("积分");
 const axisUnit=isCurrency?"元":isPoints?"积分":unit.includes("小时")?"h":"M";
 const resolvedMetricLabel=metricLabel??(isCurrency?"预计费用":isPoints?"积分消耗":"计费用量");
 const monthlySeries=data.length>=28;
 const formatTooltipValue=(value:unknown)=>isCurrency
  ? `${Number(value).toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2})} 元`
  : `${value} ${unit}`;
 return <div className="chart-canvas" aria-label={`${resolvedMetricLabel}趋势图`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:24,left:0,bottom:0}}><defs><linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.orange} stopOpacity={.24}/><stop offset="100%" stopColor={colors.orange} stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="date" interval={monthlySeries?2:0} padding={{left:4,right:4}} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}} unit={axisUnit}/><Tooltip formatter={(value)=>[formatTooltipValue(value),resolvedMetricLabel]} contentStyle={tooltipStyle}/><Area type="monotone" dataKey="usage" stroke={colors.orange} strokeWidth={2.2} fill="url(#usageFill)" dot={monthlySeries?{r:1.8,fill:colors.orange,strokeWidth:0}:false} activeDot={{r:4}}/></AreaChart></ResponsiveContainer></div>
}

export function UsageBreakdownChart({data}:{data:{name:string;value:number;label:string}[]}){
 return <div className="donut-layout"><div className="donut-chart" aria-label="用量归因占比图"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>{data.map((_,index)=><Cell key={index} fill={[colors.ink,colors.orange,colors.gray][index%3]}/>)}</Pie><Tooltip formatter={(value,name)=>[`${value}%`,name]} contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer></div><ul className="chart-legend">{data.map((item,index)=><li key={item.name}><i style={{background:[colors.ink,colors.orange,colors.gray][index%3]}}/><span><b>{item.name}</b><small>{item.label}</small></span><strong>{item.value}%</strong></li>)}</ul></div>
}

export function AccountUsageBars({data}:{data:{name:string;usage:number;cost:number}[]}){
 return <div className="chart-canvas compact" aria-label="账号用量与费用图"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{top:6,right:18,left:20,bottom:0}}><CartesianGrid stroke="#eceeef" horizontal={false}/><XAxis type="number" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}} unit="M"/><YAxis type="category" dataKey="name" width={82} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#303234"}}/><Tooltip formatter={(value)=>[`${value}M 字符`,"计费用量"]} contentStyle={tooltipStyle}/><Bar dataKey="usage" fill={colors.ink} radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div>
}

export function ConcurrencyTrendChart({data}:{data:{time:string;average:number;peak:number;limit:number;rejected:number}[]}){
 return <div className="chart-canvas concurrency-chart" aria-label="单模型并发使用趋势图"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{top:12,right:18,left:-8,bottom:0}}><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis yAxisId="concurrency" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis yAxisId="rejected" orientation="right" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#b8323a"}}/><Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10}}/><Bar yAxisId="rejected" name="超并发拒绝" dataKey="rejected" fill={colors.red} fillOpacity={.28} radius={[4,4,0,0]}/><Line yAxisId="concurrency" name="区间平均并发" type="monotone" dataKey="average" stroke={colors.gray} strokeWidth={1.4} dot={false}/><Line yAxisId="concurrency" name="区间峰值并发" type="monotone" dataKey="peak" stroke={colors.orange} strokeWidth={2.2} dot={{r:2,fill:colors.orange}}/><Line yAxisId="concurrency" name="生效并发上限" type="stepAfter" dataKey="limit" stroke={colors.ink} strokeWidth={1.8} strokeDasharray="5 4" dot={false}/></ComposedChart></ResponsiveContainer></div>
}

export function RpmTrendChart({data}:{data:{time:string;rpm:number;rpmLimit:number}[]}){
 return <div className="chart-canvas concurrency-chart" aria-label="RPM 使用与生效上限趋势图"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{top:12,right:18,left:-8,bottom:0}}><CartesianGrid stroke="#eceeef" vertical={false}/><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#73787b"}}/><Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10}}/><Line name="区间 RPM" type="monotone" dataKey="rpm" stroke={colors.orange} strokeWidth={2.2} dot={{r:2,fill:colors.orange}}/><Line name="RPM 生效上限" type="stepAfter" dataKey="rpmLimit" stroke={colors.ink} strokeWidth={1.8} strokeDasharray="5 4" dot={false}/></ComposedChart></ResponsiveContainer></div>
}
