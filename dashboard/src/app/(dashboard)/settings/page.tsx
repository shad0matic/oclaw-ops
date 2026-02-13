"use client"

import { useState } from "react";
import { AgentAvatarManager } from "@/components/settings/agent-avatar-manager";
import { AvatarLibrary } from "@/components/settings/avatar-library";
import { DefaultAvatarSettings } from "@/components/settings/default-avatar-settings";
import { UploadAvatar } from "@/components/settings/upload-avatar";
import { ModelDisplayConfig } from "@/components/settings/model-display-config";
import { ProjectManager } from "@/components/settings/project-manager";
import { XTwitterSettings } from "@/components/settings/x-twitter-settings";
import { CollapsibleSection } from "@/components/settings/collapsible-section";
import { PageHeader } from "@/components/layout/page-header"

export default function SettingsPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="space-y-3">
            <PageHeader title="Settings" subtitle="Manage agent avatars, default configurations, and dashboard preferences." />
            <CollapsibleSection title="Projects" icon="📁">
                <ProjectManager />
            </CollapsibleSection>
            <CollapsibleSection title="X/Twitter Integration" icon="🐊">
                <XTwitterSettings />
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
        </div>
    );
}
