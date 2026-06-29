"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trophy, Award, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationData {
  id: string;
  type: "levelup" | "achievement" | "badge" | "title" | "reward";
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

// Global notification queue (singleton)
let notifyFn: ((n: Omit<NotificationData, "id">) => void) | null = null;

export function pushNotification(n: Omit<NotificationData, "id">) {
  if (notifyFn) notifyFn(n);
}

export function NotificationOverlay() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    notifyFn = (n) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [...prev, { ...n, id }]);
      // 4 saniye sonra kaldır
      setTimeout(() => {
        setNotifications((prev) => prev.filter((x) => x.id !== id));
      }, 4000);
    };
    return () => { notifyFn = null; };
  }, []);

  const iconFor = (type: NotificationData["type"]) => {
    switch (type) {
      case "levelup": return Star;
      case "achievement": return Trophy;
      case "badge": return Award;
      case "title": return Award;
      case "reward": return Zap;
    }
  };

  const colorFor = (type: NotificationData["type"]) => {
    switch (type) {
      case "levelup": return "var(--accent)";
      case "achievement": return "var(--rust)";
      case "badge": return "#a855f7";
      case "title": return "#06b6d4";
      case "reward": return "var(--scrap)";
    }
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => {
          const Icon = iconFor(n.type);
          const color = n.color ?? colorFor(n.type);
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="pixel-panel px-3 py-2 flex items-center gap-2 max-w-xs"
              style={{ borderColor: color, boxShadow: `0 0 20px ${color}66` }}
            >
              <div
                className="w-8 h-8 flex items-center justify-center border-2 flex-shrink-0"
                style={{ borderColor: color, backgroundColor: `${color}22` }}
              >
                <Icon className="w-4 h-4 animate-pulse" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-pixel text-xs font-bold truncate" style={{ color }}>
                  {n.title}
                </div>
                {n.description && (
                  <div className="text-[9px] text-muted-foreground font-pixel truncate">
                    {n.description}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
