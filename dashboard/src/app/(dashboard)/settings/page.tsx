"use client"

import { useState } from "react";
import { AgentAvatarManager } from "@/components/settings/agent-avatar-manager";
import { AvatarLibrary } from "@/components/settings/avatar-library";
import { DefaultAvatarSettings } from "@/components/settings/default-avatar-settings";
import { UploadAvatar } from "@/components/settings/upload-avatar";
import { ModelDisplayConfig } from "@/components/settings/model-display-config";
import { ProjectManager } from "@/components/settings/project-manager";
import { XTwitterSettings } from "@/components/settings/x-twitter-settings";
import { BrowserBookmarkImport } from "@/components/settings/browser-bookmark-import";
import { MemoryKpisCard } from "@/components/settings/memory-kpis-card";
import { PhoneSettings } from "@/components/settings/phone-settings";
import { CollapsibleSection } from "@/components/settings/collapsible-section";
import { PageHeader } from "@/components/layout/page-header"
import { SecuritySettings } from "@/components/settings/security-settings";

export default function SettingsPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="space-y-3">
            <PageHeader title="Settings" subtitle="Manage agent avatars, default configurations, and dashboard preferences." />
            <CollapsibleSection title="Security Hardening" icon="🛡️" defaultOpen={true}>
                <div className="p-4">
                    <SecuritySettings />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Projects" icon="📁">
                <ProjectManager />
            </CollapsibleSection>
            <CollapsibleSection title="X/Twitter Integration" icon="🐊">
                <XTwitterSettings />
            </CollapsibleSection>
            <CollapsibleSection title="Browser Bookmarks" icon="🔖" defaultOpen={true}>
                <div className="p-4">
                    <BrowserBookmarkImport />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="☎️ ClawdTalk Phone" icon="☎️" defaultOpen={true}>
                <div className="p-4">
                    <PhoneSettings />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Memory KPIs" icon="🧠" defaultOpen={false}>
                <div className="p-4">
                    <MemoryKpisCard agentId="main" />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Model Display" icon="🤖">
                <ModelDisplayConfig />
            </CollapsibleSection>
            <CollapsibleSection title="Avatars" icon="🎨">
                <div className="space-y-6 p-4">
                    <AgentAvatarManager refreshKey={refreshKey} />
                    <DefaultAvatarSettings />
                    <AvatarLibrary refreshKey={refreshKey} onDelete={refresh} />
                    <UploadAvatar onUpload={refresh} />
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Admin Infos" icon="🔧" defaultOpen={false}>
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🗄️</span>
                        <div>
                            <a 
                                href="/db-schema.html" 
                                target="_blank"
                                className="text-cyan-400 hover:text-cyan-300 font-medium"
                            >
                                Database Schema
                            </a>
                            <p className="text-sm text-gray-400">Visual ERD of all tables and relationships</p>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
