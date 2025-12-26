"use client"

import React, { useState } from "react"
import {
  Sun,
  Moon,
  Shield,
  Brain,
  Coins,
  Diamond,
  Hourglass,
  Zap,
  ScrollText,
  ChevronDown,
  Star,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Types ---
export type RemedyType = "IMMEDIATE" | "LONG_TERM"

export interface Remedy {
  type: RemedyType
  title: string
  description: string
  timeframe: string
}

export interface GrahaData {
  score: number
  interpretation: string
  remedies: Remedy[]
}

export interface SummaryData {
  advisor_note: string
  dominant_strengths: string[]
  key_vulnerabilities: string[]
}

export interface FinancialReportData {
  grahas: Record<string, GrahaData>
  summary: SummaryData
}

// --- Configuration with Emojis & Icons ---
const GRAHA_META: Record<string, { label: string; sub: string; icon: LucideIcon; emoji: string; bg: string }> = {
  surya: { label: "Surya", sub: "Income", icon: Sun, emoji: "☀️", bg: "bg-orange-500" },
  chandra: { label: "Chandra", sub: "Stability", icon: Moon, emoji: "🌙", bg: "bg-blue-400" },
  mangal: { label: "Mangal", sub: "Protection", icon: Shield, emoji: "🔴", bg: "bg-red-600" },
  budh: { label: "Budh", sub: "Planning", icon: Brain, emoji: "🟢", bg: "bg-emerald-500" },
  guru: { label: "Guru", sub: "Wealth", icon: Coins, emoji: "🟡", bg: "bg-yellow-600" },
  shukra: { label: "Shukra", sub: "Luxury", icon: Diamond, emoji: "💎", bg: "bg-pink-500" },
  shani: { label: "Shani", sub: "Discipline", icon: Hourglass, emoji: "🪐", bg: "bg-slate-800" },
  rahu: { label: "Rahu", sub: "Risk", icon: Zap, emoji: "🟣", bg: "bg-purple-700" },
  ketu: { label: "Ketu", sub: "Legacy", icon: ScrollText, emoji: "🌕", bg: "bg-stone-600" },
}

const getStatusColor = (score: number) => {
  if (score >= 70) return { text: "text-green-700", bg: "bg-green-500" }
  if (score >= 40) return { text: "text-yellow-700", bg: "bg-yellow-500" }
  return { text: "text-red-700", bg: "bg-red-500" }
}

// --- Sub-Components ---
// const GRAHA_META = {
//   surya: { label: "Surya", emoji: "☀️" },
//   chandra: { label: "Chandra", emoji: "🌙" },
//   mangal: { label: "Mangal", emoji: "🔴" },
//   budh: { label: "Budh", emoji: "🟢" },
//   guru: { label: "Guru", emoji: "🟡" },
//   shukra: { label: "Shukra", emoji: "💎" },
//   shani: { label: "Shani", emoji: "🪐" },
//   rahu: { label: "Rahu", emoji: "🟣" },
//   ketu: { label: "Ketu", emoji: "🌕" },
// }

// Map scores to the specific colors in the image
const getSegmentColor = (score: number) => {
  if (score >= 75) return "#26ba8d" // Green (Surya)
  if (score >= 60) return "#ffb74d" // Orange/Amber (Guru, Ketu, Shukra)
  return "#f9a8a8" // Red/Pink (Chandra, Mangal, Budh, Rahu, Shani)
}

const KundliChart = ({ data }: { data: Record<string, GrahaData> }) => {
  const grahaKeys = Object.keys(GRAHA_META)
  const totalScore = grahaKeys.reduce((sum, key) => sum + (data[key]?.score || 0), 0)
  const avgScore = Math.round(totalScore / grahaKeys.length)

  const centerX = 200
  const centerY = 200
  const outerRadius = 180
  const innerRadius = 65
  const gap = 2 // Gap between segments

  // Helper to calculate coordinates
  const getCoords = (radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  return (
    <div className="relative w-full aspect-square max-w-[450px] mx-auto flex items-center justify-center p-4">
      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl overflow-visible">
        {/* Outer Dotted Ring */}
        <circle
          cx="200"
          cy="200"
          r="195"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Generate 9 Segments */}
        {grahaKeys.map((key, i) => {
          const score = data[key]?.score || 0
          const meta = GRAHA_META[key as keyof typeof GRAHA_META]
          
          // 360 / 9 = 40 degrees per segment
          const startAngle = i * 40 + gap
          const endAngle = (i + 1) * 40 - gap
          
          const p1 = getCoords(innerRadius, startAngle)
          const p2 = getCoords(outerRadius, startAngle)
          const p3 = getCoords(outerRadius, endAngle)
          const p4 = getCoords(innerRadius, endAngle)

          const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

          // Path: Move to inner start, Line to outer start, Arc to outer end, Line to inner end, Arc back to inner start
          const d = `
            M ${p1.x} ${p1.y}
            L ${p2.x} ${p2.y}
            A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p3.x} ${p3.y}
            L ${p4.x} ${p4.y}
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p1.x} ${p1.y}
            Z
          `

          // Center of the segment for text placement
          const textAngle = startAngle + (endAngle - startAngle) / 2
          const labelPos = getCoords(outerRadius - 45, textAngle)
          const scorePos = getCoords(outerRadius - 65, textAngle)
          const iconPos = getCoords(outerRadius - 95, textAngle)

          return (
            <g key={key} className="transition-all duration-300 hover:opacity-90 cursor-default group">
              <path
                d={d}
                fill={getSegmentColor(score)}
                stroke="white"
                strokeWidth="2"
              />
              
              {/* Graha Name */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                className="fill-slate-800 text-[13px] font-bold"
              >
                {meta.label}
              </text>

              {/* Individual Graha Score */}
              <text
                x={scorePos.x}
                y={scorePos.y}
                textAnchor="middle"
                style={{ fill: getSegmentColor(score), filter: 'brightness(0.7)' }}
                className="text-[12px] font-black"
              >
                {score}
              </text>

              {/* Emoji Icon */}
              <text
                x={iconPos.x}
                y={iconPos.y + 5}
                textAnchor="middle"
                className="text-2xl select-none"
              >
                {meta.emoji}
              </text>
            </g>
          )
        })}

        {/* Central Kundli Score Circle */}
        <defs>
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a5f7a" />
            <stop offset="100%" stopColor="#0d9488" />
          </radialGradient>
        </defs>
        
        <circle
          cx="200"
          cy="200"
          r="65"
          fill="url(#centerGradient)"
          stroke="white"
          strokeWidth="4"
          className="drop-shadow-lg"
        />
        
        <text
          x="200"
          y="195"
          textAnchor="middle"
          fill="white"
          className="text-5xl font-black"
        >
          {avgScore}
        </text>
        
        <text
          x="200"
          y="218"
          textAnchor="middle"
          fill="white"
          className="text-[10px] font-bold uppercase tracking-wider opacity-90"
        >
          Kundli Score
        </text>
      </svg>
    </div>
  )
}


const GrahaCard = ({ grahaKey, data }: { grahaKey: string; data: GrahaData }) => {
  const [isOpen, setIsOpen] = useState(false)
  const meta = GRAHA_META[grahaKey]
  const status = getStatusColor(data.score)

  return (
    <div className={cn(
      "bg-white rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden flex flex-col h-full",
      isOpen && "ring-2 ring-indigo-500/10"
    )}>
      <div className="p-5 flex-grow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner", meta.bg.replace('bg-', 'bg-opacity-10 bg-'))}>
               {meta.emoji}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">{meta.label}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{meta.sub}</p>
            </div>
          </div>
          <div className={cn("text-xl font-black", status.text)}>
            {data.score}<span className="text-[10px] opacity-40 ml-0.5">/100</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-3">
          {data.interpretation}
        </p>

        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", status.bg)} style={{ width: `${data.score}%` }} />
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-indigo-50 transition-colors border-t border-slate-100"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">View Remedies</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 space-y-3 bg-slate-50 animate-in slide-in-from-top-2 duration-300">
          {data.remedies.map((remedy, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[9px] font-black uppercase tracking-tighter", remedy.type === "IMMEDIATE" ? "text-orange-600" : "text-indigo-600")}>
                  {remedy.type}
                </span>
                <span className="text-[9px] font-medium text-slate-400">{remedy.timeframe}</span>
              </div>
              <h4 className="text-[11px] font-bold text-slate-800 mb-1">{remedy.title}</h4>
              <p className="text-[10px] text-slate-500 leading-tight">{remedy.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Main Page ---

const GrahaReport = ({ data }: { data: FinancialReportData }) => {
  if (!data) return null

  return (
    <div className="min-h-screen bg-[#fafafb] font-sans pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-10">
        
        {/* Top Centered Chart */}
        <section className="mb-16">
          <div className="text-center mb-8">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" /> Celestial Alignment Matrix
            </div>
            <h2 className="text-2xl font-black text-slate-900">Your Wealth Kundli</h2>
          </div>
          
          <KundliChart data={data.grahas} />

          {/* Quick Summary Bar */}
          <div className="max-w-3xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Brain className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Advisor's Note</p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{data.summary.advisor_note}"</p>
              </div>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Star className="w-5 h-5" /></div>
              <div className="w-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Key Highlights</p>
                <div className="flex flex-wrap gap-2">
                  {data.summary.dominant_strengths.slice(0, 2).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100">{s}</span>
                  ))}
                  {data.summary.key_vulnerabilities.slice(0, 1).map((v, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[9px] font-bold border border-red-100">{v}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3x3 Planetary Grid */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-900 text-xl">Planetary Breakdown</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Strong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Weak</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(GRAHA_META).map((key) => (
              <GrahaCard key={key} grahaKey={key} data={data.grahas[key]} />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

export default GrahaReport