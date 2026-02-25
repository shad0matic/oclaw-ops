#!/usr/bin/env node

/**
 * OpenClaw Onboarding Wizard CLI
 * 
 * Interactive wizard for:
 * - API key collection
 * - Component selection (Echo, Smaug, Postgres)
 * - Config validation
 * 
 * Part of Mac Deployment Package
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

function log(msg, color = 'white') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg) {
  console.log(`\n${colors.cyan}${colors.bright}═══ ${msg} ═══${colors.reset}\n`);
}

function section(msg) {
  console.log(`\n${colors.yellow}${colors.bright}▶ ${msg}${colors.reset}\n`);
}

function success(msg) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}✗ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ ${msg}${colors.reset}`);
}

import { createInterface } from 'readline';

// Simple prompt function using readline
function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`${colors.cyan}${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function confirm(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`${colors.cyan}${message} (y/n)${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Component definitions
const components = {
  echo: {
    name: 'Echo',
    description: '🔊 Media analyst — listens, transcribes, extracts knowledge',
    requires: ['google-api-key'],
    skills: ['transcription', 'knowledge-extraction']
  },
  smaug: {
    name: 'Smaug',
    description: '🐉 Treasure guardian — bookmarks, cost monitoring, system health',
    requires: ['openai-api-key'],
    skills: ['bookmarks', 'cost-monitoring']
  },
  postgres: {
    name: 'Postgres',
    description: '🗄️ Database for persistent storage and memory',
    requires: ['postgres-connection'],
    skills: ['database']
  }
};

// API providers supported
const apiProviders = {
  'openai-api-key': {
    name: 'OpenAI',
    keyEnv: 'OPENAI_API_KEY',
    prompt: 'Enter your OpenAI API key (sk-...):',
    envVar: 'OPENAI_API_KEY'
  },
  'anthropic-api-key': {
    name: 'Anthropic',
    keyEnv: 'ANTHROPIC_API_KEY',
    prompt: 'Enter your Anthropic API key (sk-ant-...):',
    envVar: 'ANTHROPIC_API_KEY'
  },
  'google-api-key': {
    name: 'Google Gemini',
    keyEnv: 'GOOGLE_API_KEY',
    prompt: 'Enter your Google API key:',
    envVar: 'GOOGLE_API_KEY'
  },
  'minimax-api-key': {
    name: 'MiniMax',
    keyEnv: 'MINIMAX_API_KEY',
    prompt: 'Enter your MiniMax API key:',
    envVar: 'MINIMAX_API_KEY'
  },
  'xai-api-key': {
    name: 'xAI',
    keyEnv: 'XAI_API_KEY',
    prompt: 'Enter your xAI API key:',
    envVar: 'XAI_API_KEY'
  }
};

// PostgreSQL connection config
const postgresDefaults = {
  host: 'localhost',
  port: 5432,
  database: 'openclaw_db',
  user: 'openclaw'
};

export async function runOnboardingWizard(options = {}) {
  const { nonInteractive = false, json = false, components: requestedComponents = [] } = options;
  
  if (json) {
    return runJsonOutput(options);
  }
  
  header('🦞 OpenClaw Onboarding Wizard');
  log('Welcome! This wizard will help you set up OpenClaw with your preferred components.\n', 'cyan');
  
  // Step 1: Component Selection
  section('Step 1: Select Components');
  log('Choose which components you want to set up:\n', 'white');
  
  const selectedComponents = await selectComponents(nonInteractive, requestedComponents);
  
  if (selectedComponents.length === 0) {
    error('No components selected. Exiting.');
    process.exit(1);
  }
  
  success(`Selected: ${selectedComponents.map(c => components[c].name).join(', ')}`);
  
  // Step 2: API Key Collection
  section('Step 2: API Keys');
  const requiredApis = collectRequiredApis(selectedComponents);
  
  const apiKeys = await collectApiKeys(requiredApis, nonInteractive);
  
  // Step 3: Postgres Configuration (if selected)
  let postgresConfig = {};
  if (selectedComponents.includes('postgres')) {
    section('Step 3: PostgreSQL Configuration');
    postgresConfig = await configurePostgres(nonInteractive);
  }
  
  // Step 4: Generate Configuration
  section('Step 4: Configuration Summary');
  
  const config = {
    components: selectedComponents,
    apiKeys: maskApiKeys(apiKeys),
    postgres: postgresConfig,
    createdAt: new Date().toISOString()
  };
  
  log('\nConfiguration Summary:', 'cyan');
  console.log(JSON.stringify(config, null, 2));
  
  // Step 5: Validation
  section('Step 5: Validation');
  const validation = await validateConfig(config, apiKeys);
  
  if (validation.valid) {
    success('Configuration is valid!');
  } else {
    error('Validation failed:');
    validation.errors.forEach(e => error(`  - ${e}`));
  }
  
  // Step 6: Save Configuration
  section('Step 6: Save Configuration');
  const shouldSave = nonInteractive || await confirm('Save configuration to ~/.openclaw/onboarding-config.json?');
  
  if (shouldSave) {
    saveConfig(config, apiKeys);
    success('Configuration saved!');
  }
  
  // Step 7: Next Steps
  header('🎉 Setup Complete!');
  log('\nNext steps:', 'cyan');
  log('1. Run: openclaw setup', 'white');
  log('2. Run: openclaw gateway start', 'white');
  log('3. Run: openclaw status', 'white');
  
  return config;
}

async function selectComponents(nonInteractive, requestedComponents = []) {
  // If components are specified via CLI, use those
  if (requestedComponents.length > 0) {
    return requestedComponents;
  }
  
  const selected = [];
  
  for (const [key, component] of Object.entries(components)) {
    const choice = nonInteractive 
      ? true 
      : await confirm(`Set up ${component.name}? ${component.description}`);
    
    if (choice) {
      selected.push(key);
    }
  }
  
  return selected;
}

function collectRequiredApis(selectedComponents) {
  const apis = new Set();
  
  for (const comp of selectedComponents) {
    const compDef = components[comp];
    if (compDef && compDef.requires) {
      compDef.requires.forEach(req => apis.add(req));
    }
  }
  
  return Array.from(apis);
}

async function collectApiKeys(requiredApis, nonInteractive) {
  const apiKeys = {};
  
  for (const api of requiredApis) {
    if (api === 'postgres-connection') continue; // Handle separately
    
    const provider = apiProviders[api];
    if (!provider) {
      info(`Skipping unknown API requirement: ${api}`);
      continue;
    }
    
    // Check if already in environment
    const envKey = process.env[provider.keyEnv];
    if (envKey) {
      apiKeys[api] = envKey;
      success(`${provider.name} API key found in environment`);
      continue;
    }
    
    if (nonInteractive) {
      info(`Skipping ${provider.name} API key (non-interactive mode)`);
      continue;
    }
    
    const key = await prompt(provider.prompt);
    if (key && key.trim()) {
      apiKeys[api] = key.trim();
      success(`${provider.name} API key collected`);
    }
  }
  
  return apiKeys;
}

async function configurePostgres(nonInteractive) {
  const config = { ...postgresDefaults };
  
  if (nonInteractive) {
    return config;
  }
  
  const host = await prompt(`Postgres host [${postgresDefaults.host}]:`) || postgresDefaults.host;
  const port = await prompt(`Postgres port [${postgresDefaults.port}]:`) || postgresDefaults.port;
  const database = await prompt(`Postgres database [${postgresDefaults.database}]:`) || postgresDefaults.database;
  const user = await prompt(`Postgres user [${postgresDefaults.user}]:`) || postgresDefaults.user;
  const password = await prompt('Postgres password:');
  
  config.host = host;
  config.port = parseInt(port);
  config.database = database;
  config.user = user;
  config.password = password;
  
  success('Postgres configuration collected');
  
  return config;
}

function maskApiKeys(apiKeys) {
  const masked = {};
  for (const [key, value] of Object.entries(apiKeys)) {
    if (value && value.length > 8) {
      masked[key] = value.substring(0, 4) + '...' + value.substring(value.length - 4);
    } else {
      masked[key] = '***';
    }
  }
  return masked;
}

async function validateConfig(config, apiKeys) {
  const errors = [];
  const warnings = [];
  
  // Check if at least one component is selected
  if (config.components.length === 0) {
    errors.push('No components selected');
  }
  
  // Check for required API keys
  const requiredApis = collectRequiredApis(config.components);
  for (const api of requiredApis) {
    if (api === 'postgres-connection') continue;
    if (!apiKeys[api] && !process.env[apiProviders[api]?.keyEnv]) {
      warnings.push(`Missing API key for: ${api}`);
    }
  }
  
  // Validate Postgres if selected
  if (config.components.includes('postgres')) {
    if (!config.postgres || !config.postgres.host) {
      errors.push('Postgres configuration incomplete');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function saveConfig(config, apiKeys) {
  const configDir = join(homedir(), '.openclaw');
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  const configPath = join(configDir, 'onboarding-config.json');
  
  // Save public config (masked keys)
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Save secrets separately
  const secretsPath = join(configDir, '.onboarding-secrets.json');
  const secrets = {
    ...apiKeys,
    postgres: config.postgres?.password ? { password: config.postgres.password } : {}
  };
  writeFileSync(secretsPath, JSON.stringify(secrets, null, 2));
  
  info(`Configuration saved to: ${configPath}`);
  info(`Secrets saved to: ${secretsPath} (keep private!)`);
}

async function runJsonOutput(options) {
  const config = {
    components: options.components || [],
    apiKeys: {},
    postgres: options.postgres || {},
    mode: 'json'
  };
  
  console.log(JSON.stringify(config, null, 2));
  return config;
}

// CLI entry point
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🦞 OpenClaw Onboarding Wizard CLI

Usage: openclaw-onboard [options]

Options:
  --non-interactive    Run without prompts
  --json                Output JSON
  --component <name>   Select component (echo, smaug, postgres)
  --api-key <key>      Set API key
  --help, -h           Show this help

Examples:
  openclaw-onboard
  openclaw-onboard --non-interactive --component echo --component postgres
  `);
  process.exit(0);
}

const opts = {
  nonInteractive: args.includes('--non-interactive'),
  json: args.includes('--json'),
  components: args.filter(a => a.startsWith('--component=')).map(a => a.split('=')[1])
};

// Parse other arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && args[i + 1]) {
    // Handle API key argument
    i++;
  }
}

runOnboardingWizard(opts).catch(err => {
  console.error('Onboarding failed:', err);
  process.exit(1);
});
