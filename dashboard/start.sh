#!/bin/bash
export PATH="/home/shad/.nvm/versions/node/v24.14.0/bin:$PATH"
cd /home/shad/projects/oclaw-ops/dashboard

# Source env vars (Next.js needs them at runtime for server components)
set -a
source .env.local
set +a

exec node node_modules/next/dist/bin/next start -p 3003
