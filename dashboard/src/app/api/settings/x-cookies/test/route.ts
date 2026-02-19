import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { z } from 'zod';

export const dynamic = "force-dynamic";

const configPath = '/home/openclaw/.openclaw/phil-config.json';
const birdCliPath = '/home/openclaw/.local/share/pnpm/bird';

const cookiesSchema = z.object({
  auth_token: z.string(),
  ct0: z.string(),
});

const configSchema = z.object({
  cookies: cookiesSchema,
  validated: z.boolean(),
  username: z.string().optional(),
  last_tested: z.string().optional(),
});

type PhilConfig = z.infer<typeof configSchema>;

async function readConfig(): Promise<PhilConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        cookies: { auth_token: '', ct0: '' },
        validated: false,
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
        const command = `${birdCliPath} --auth-token "${auth_token}" --ct0 "${ct0}" whoami --plain`;
        const result = execSync(command, { encoding: 'utf8', timeout: 15000 });
        const userMatch = result.match(/user:\s*@(\S+)/);
        if (userMatch) {
            return { valid: true, username: userMatch[1] };
        }
        return { valid: false, error: 'Could not parse whoami output' };
    } catch (error) {
        console.error('Error testing bird CLI:', error);
        return { valid: false, error: (error as Error).message };
    }
}

export async function POST() {
  const config = await readConfig();

  if (!config.cookies || !config.cookies.auth_token || !config.cookies.ct0) {
    return NextResponse.json({ valid: false, error: 'Cookies not configured' });
  }

  const testResult = await testCookies(config.cookies.auth_token, config.cookies.ct0);

  const newConfig: PhilConfig = {
    ...config,
    validated: testResult.valid,
    username: testResult.username,
    last_tested: new Date().toISOString(),
  };

  await writeConfig(newConfig);

  return NextResponse.json({
    valid: testResult.valid,
    username: testResult.username,
    error: testResult.error,
  });
}
