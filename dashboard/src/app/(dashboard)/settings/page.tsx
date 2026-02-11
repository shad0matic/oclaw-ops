
import { AgentAvatarManager } from '@/components/settings/agent-avatar-manager';
import { DefaultAvatarSettings } from '@/components/settings/default-avatar-settings';
import { AvatarLibrary } from '@/components/settings/avatar-library';
import { UploadAvatar } from '@/components/settings/upload-avatar';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AgentAvatarManager />
          <DefaultAvatarSettings />
        </div>
        <div className="space-y-6">
          <AvatarLibrary />
          <UploadAvatar />
        </div>
      </div>
    </div>
  );
}
