import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface Crumb {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    subtitle: string
    crumbs?: Crumb[]
}

export function PageHeader({ title, subtitle, crumbs }: PageHeaderProps) {
    const allCrumbs: Crumb[] = [
        { label: "Overview", href: "/" },
        ...(crumbs || []),
        { label: title },
    ]

    return (
        <div className="space-y-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-zinc-500">
                {allCrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                        {crumb.href ? (
                            <Link href={crumb.href} className="hover:text-zinc-300 transition-colors">
                                {i === 0 ? (
                                    <span className="flex items-center gap-1">
                                        <Home className="h-3 w-3" aria-hidden="true" />
                                        <span className="sr-only">{crumb.label}</span>
                                    </span>
                                ) : (
                                    crumb.label
                                )}
                            </Link>
                        ) : (
                            <span className="text-zinc-300">{crumb.label}</span>
                        )}
                    </span>
                ))}
            </nav>
            <h2 className="text-3xl font-bold tracking-tight text-white">{title}</h2>
            <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
    )
}
