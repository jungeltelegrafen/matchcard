'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS = {
  'AI':           'bg-violet-50 text-violet-600 border-violet-200',
  'Automation':   'bg-blue-50 text-blue-600 border-blue-200',
  'Intelligence': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Sales':        'bg-orange-50 text-orange-600 border-orange-200',
  'Documents':    'bg-accent-light text-accent border-accent/20',
}

export default function ServiceCard({ service, index }) {
  const isLive       = !!service.url
  const isSuggestion = service.status === 'suggestion'
  const tagColor     = CATEGORY_COLORS[service.category] || 'bg-gray-100 text-gray-500 border-gray-200'

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.25, 0.4, 0.25, 1] }}
      whileHover={isLive ? { y: -3, transition: { duration: 0.18 } } : {}}
      className={cn(
        'group flex flex-col gap-4 rounded-2xl border bg-card p-6',
        'transition-all duration-200',
        isLive
          ? 'border-accent/30 shadow-[0_2px_12px_rgba(201,123,75,0.08)] hover:shadow-[0_8px_32px_rgba(201,123,75,0.16)] hover:border-accent/50 cursor-pointer'
          : 'border-border shadow-sm opacity-55',
      )}
    >
      {/* Icon + live indicator */}
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none">{service.icon}</span>
        {isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 space-y-1.5">
        <h2 className="text-[15px] font-[700] text-tx leading-snug tracking-tight">
          {service.name}
        </h2>
        <p className="text-[13px] leading-relaxed text-tx-muted">
          {service.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <span className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
          isSuggestion ? 'bg-gray-100 text-gray-400 border-gray-200' : tagColor
        )}>
          {service.category}
        </span>
        {isLive && (
          <span className="text-xs font-semibold text-accent/60 group-hover:text-accent transition-colors">
            Open →
          </span>
        )}
        {isSuggestion && (
          <span className="text-[11px] text-tx-muted/50 italic">Suggestion</span>
        )}
      </div>
    </motion.div>
  )

  if (isLive) {
    return (
      <Link href={service.url} target="_blank" rel="noopener" className="block">
        {card}
      </Link>
    )
  }
  return card
}
