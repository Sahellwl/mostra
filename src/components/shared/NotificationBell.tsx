'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications'
import { markAllAsRead, markAsRead } from '@/app/notifications/actions'

interface NotificationBellProps {
  userId: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'il y a quelques secondes'
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

const TYPE_ICONS: Record<string, string> = {
  comment_added: '💬',
  phase_ready: '✅',
  phase_approved: '🎉',
  revision_requested: '🔄',
  form_submitted: '📋',
  file_uploaded: '🎬',
  project_created: '🚀',
  member_joined: '👋',
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useRealtimeNotifications(userId)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen((o) => !o)
  }

  async function handleMarkAll() {
    markAllRead()
    await markAllAsRead()
  }

  async function handleNotifClick(id: string, isRead: boolean) {
    if (!isRead) {
      markRead(id)
      await markAsRead(id)
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-[#00D76B] text-black text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs font-semibold text-white tracking-wide">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#00D76B] transition-colors"
              >
                <Check className="h-3 w-3" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[#1a1a1a]">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#555555] italic">
                Aucune notification
              </p>
            ) : (
              notifications.map((notif) => {
                const icon = TYPE_ICONS[notif.type] ?? '🔔'
                const inner = (
                  <div
                    className={`flex gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                      !notif.is_read ? 'bg-[#00D76B]/5' : ''
                    }`}
                    onClick={() => handleNotifClick(notif.id, notif.is_read)}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 mt-1">
                      {!notif.is_read ? (
                        <span className="block w-1.5 h-1.5 rounded-full bg-[#00D76B] mt-0.5" />
                      ) : (
                        <span className="block w-1.5 h-1.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        <span className="text-sm flex-shrink-0">{icon}</span>
                        <p className="text-xs text-white font-medium leading-snug truncate">
                          {notif.title}
                        </p>
                      </div>
                      {notif.message && (
                        <p className="text-[11px] text-[#666666] mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[10px] text-[#444444] mt-1">{timeAgo(notif.created_at)}</p>
                    </div>

                    {/* External link indicator */}
                    {notif.link && <ExternalLink className="h-3 w-3 text-[#333333] flex-shrink-0 mt-1" />}
                  </div>
                )

                return notif.link ? (
                  <Link key={notif.id} href={notif.link}>
                    {inner}
                  </Link>
                ) : (
                  <div key={notif.id}>{inner}</div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#1a1a1a] text-center">
              <p className="text-[10px] text-[#444444]">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
