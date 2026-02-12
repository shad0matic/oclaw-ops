"use client"

import { useIsMobile } from "@/hooks/useMediaQuery"
import { DesktopOverview } from "./desktop-overview"
import { MobileOverview } from "./mobile-overview"

export function Overview() {
  const isMobile = useIsMobile()

  // Render mobile or desktop based on viewport
  // Mobile: < 768px, Desktop: >= 768px
  if (isMobile) {
    return <MobileOverview />
  }

  return <DesktopOverview />
}
