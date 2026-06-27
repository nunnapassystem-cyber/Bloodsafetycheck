'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TransfusionLog } from '@/types'

export function useRealtimeLogs(onNewFail: (log: TransfusionLog) => void) {
  const callbackRef = useRef(onNewFail)
  useEffect(() => { callbackRef.current = onNewFail })
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('transfusion_logs_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transfusion_logs' },
        (payload) => {
          const log = payload.new as TransfusionLog
          if (log.match_result === 'FAIL') callbackRef.current(log)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
}
