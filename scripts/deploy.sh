#!/usr/bin/env bash
set -euo pipefail

echo "==> Happy Hour Deploy Script"
echo ""

# -------------------------------------------------------------------
# 1. Check that AWS CLI is configured
# -------------------------------------------------------------------
if ! aws sts get-caller-identity &>/dev/null; then
  echo "ERROR: AWS CLI is not configured or credentials are invalid."
  echo "Run 'aws configure' or export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
  exit 1
fi

echo "[+] AWS credentials OK ($(aws sts get-caller-identity --query 'Account' --output text))"

# -------------------------------------------------------------------
# 2. Build TypeScript
# -------------------------------------------------------------------
echo "[+] Building TypeScript..."
npm run build

# -------------------------------------------------------------------
# 3. CDK synth — validate the CloudFormation template
# -------------------------------------------------------------------
echo "[+] Running CDK synth..."
npx cdk synth --app 'npx ts-node infra/bin/app.ts' --quiet

# -------------------------------------------------------------------
# 4. CDK deploy
# -------------------------------------------------------------------
echo "[+] Deploying stack..."
npx cdk deploy --app 'npx ts-node infra/bin/app.ts' --require-approval never --outputs-file cdk-outputs.json

# -------------------------------------------------------------------
# 5. Print the API Gateway URL from CDK outputs
# -------------------------------------------------------------------
echo ""
echo "==> Deployment complete!"
echo ""

if [ -f cdk-outputs.json ]; then
  API_URL=$(python3 -c "
import json, sys
with open('cdk-outputs.json') as f:
    outputs = json.load(f)
for stack in outputs.values():
    for key, val in stack.items():
        if 'ApiUrl' in key or 'apiurl' in key.lower():
            print(val)
            sys.exit(0)
print('(could not find API URL in outputs)')
" 2>/dev/null || echo "(could not parse cdk-outputs.json)")
  echo "API Gateway URL: ${API_URL}"
  rm -f cdk-outputs.json
else
  echo "NOTE: Could not read CDK outputs file."
fi
