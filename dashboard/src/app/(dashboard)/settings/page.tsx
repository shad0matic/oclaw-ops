"use client"

import { useState } from "react";
import { AgentAvatarManager } from "@/components/settings/agent-avatar-manager";
import { AvatarLibrary } from "@/components/settings/avatar-library";
import { DefaultAvatarSettings } from "@/components/settings/default-avatar-settings";
import { UploadAvatar } from "@/components/settings/upload-avatar";

export default function SettingsPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <AgentAvatarManager refreshKey={refreshKey} />
            <DefaultAvatarSettings />
            <AvatarLibrary refreshKey={refreshKey} onDelete={refresh} />
            <UploadAvatar onUpload={refresh} />
        </div>
    );
}
