"use client"

import { useState } from "react";
import { AgentAvatarManager } from "@/components/settings/agent-avatar-manager";
import { AvatarLibrary } from "@/components/settings/avatar-library";
import { DefaultAvatarSettings } from "@/components/settings/default-avatar-settings";
import { UploadAvatar } from "@/components/settings/upload-avatar";
import { ModelDisplayConfig } from "@/components/settings/model-display-config";
import { ProjectManager } from "@/components/settings/project-manager";
import { XTwitterSettings } from "@/components/settings/x-twitter-settings";
import { PageHeader } from "@/components/layout/page-header"

export default function SettingsPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="space-y-8">
            <PageHeader title="Settings" subtitle="Manage agent avatars, default configurations, and dashboard preferences." />
            <ProjectManager />
            <XTwitterSettings />
            <ModelDisplayConfig />
            <AgentAvatarManager refreshKey={refreshKey} />
            <DefaultAvatarSettings />
            <AvatarLibrary refreshKey={refreshKey} onDelete={refresh} />
            <UploadAvatar onUpload={refresh} />
        </div>
    );
}
