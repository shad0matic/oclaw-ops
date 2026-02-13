import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = "force-dynamic";

const configPath = '/home/shad/.openclaw/phil-config.json';
const birdCliPath = '/home/shad/.local/share/pnpm/bird';

type PhilConfig = {
  auth_token: string;
  ct0: string;
  last_tested: string | null;
  status: 'valid' | 'expired' | 'missing';
  username?: string;
};

async function readConfig(): Promise<PhilConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        auth_token: '',
        ct0: '',
        last_tested: null,
        status: 'missing',
      };
    }
    throw error;
  }
}

async function writeConfig(config: PhilConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function testCookies(auth_token: string, ct0: string): Promise<{ valid: boolean, username?: string, error?: string }> {
    if (!auth_token || !ct0) {
        return { valid: false, error: 'Missing auth_token or ct0' };
    }
    try {
        const command = `${birdCliPath} --auth-token "${auth_token}" --ct0 "${ct0}" whoami --plain --json`;
        const result = execSync(command, { encoding: 'utf8' });
        const data = JSON.parse(result);
        if (data.valid) {
            return { valid: true, username: data.username };
        }
        return { valid: false, error: 'Invalid credentials' };
    } catch (error) {
        console.error('Error testing bird CLI:', error);
        return { valid: false, error: error.message };
    }
}

export async function POST() {
  const config = await readConfig();

  if (config.status === 'missing' || !config.auth_token || !config.ct0) {
    return NextResponse.json({ valid: false, error: 'Cookies not configured' });
  }

  const testResult = await testCookies(config.auth_token, config.ct0);

  const newConfig: PhilConfig = {
    ...config,
    last_tested: new Date().toISOString(),
    status: testResult.valid ? 'valid' : 'expired',
    username: testResult.username,
  };

  await writeConfig(newConfig);

  return NextResponse.json({
    valid: testResult.valid,
    username: testResult.username,
    error: testResult.error,
  });
}
