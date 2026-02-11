
import { AgentAvatarManager } from "@/components/settings/agent-avatar-manager";
import { AvatarLibrary } from "@/components/settings/avatar-library";
import { DefaultAvatarSettings } from "@/components/settings/default-avatar-settings";
import { UploadAvatar } from "@/components/settings/upload-avatar";

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <AgentAvatarManager />
            <DefaultAvatarSettings />
            <AvatarLibrary />
            <UploadAvatar />
        </div>
    );
}
