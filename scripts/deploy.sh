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
# 5. Build the frontend
# -------------------------------------------------------------------
echo "[+] Building frontend..."
cd web && npm run build && cd ..

# -------------------------------------------------------------------
# 6. Extract CDK outputs and deploy frontend to S3
# -------------------------------------------------------------------
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

  FRONTEND_BUCKET=$(python3 -c "
import json, sys
with open('cdk-outputs.json') as f:
    outputs = json.load(f)
for stack in outputs.values():
    for key, val in stack.items():
        if 'FrontendBucketName' in key:
            print(val)
            sys.exit(0)
print('')
" 2>/dev/null || echo "")

  FRONTEND_URL=$(python3 -c "
import json, sys
with open('cdk-outputs.json') as f:
    outputs = json.load(f)
for stack in outputs.values():
    for key, val in stack.items():
        if 'FrontendUrl' in key:
            print(val)
            sys.exit(0)
print('')
" 2>/dev/null || echo "")

  FRONTEND_DIST_ID=$(python3 -c "
import json, sys, re
with open('cdk-outputs.json') as f:
    outputs = json.load(f)
for stack in outputs.values():
    for key, val in stack.items():
        if 'FrontendUrl' in key:
            # Extract domain from https://XXXXX.cloudfront.net
            domain = val.replace('https://', '').strip('/')
            break
# Use AWS CLI to find distribution ID by domain
import subprocess
result = subprocess.run(
    ['aws', 'cloudfront', 'list-distributions', '--query',
     \"DistributionList.Items[?DomainName=='\" + domain + \"'].Id\",
     '--output', 'text'],
    capture_output=True, text=True)
dist_id = result.stdout.strip()
if dist_id:
    print(dist_id)
else:
    print('')
" 2>/dev/null || echo "")

  rm -f cdk-outputs.json

  # -------------------------------------------------------------------
  # 7. Sync frontend files to S3
  # -------------------------------------------------------------------
  if [ -n "$FRONTEND_BUCKET" ]; then
    echo "[+] Syncing frontend to S3 bucket: ${FRONTEND_BUCKET}..."
    aws s3 sync web/out/ s3://$FRONTEND_BUCKET --delete
  else
    echo "WARNING: Could not determine frontend bucket name. Skipping S3 sync."
  fi

  # -------------------------------------------------------------------
  # 8. Invalidate CloudFront cache
  # -------------------------------------------------------------------
  if [ -n "$FRONTEND_DIST_ID" ]; then
    echo "[+] Invalidating CloudFront cache for frontend distribution..."
    aws cloudfront create-invalidation --distribution-id $FRONTEND_DIST_ID --paths "/*"
  else
    echo "WARNING: Could not determine frontend CloudFront distribution ID. Skipping invalidation."
  fi

  # -------------------------------------------------------------------
  # 9. Print deployment summary
  # -------------------------------------------------------------------
  echo ""
  echo "==> Deployment complete!"
  echo ""
  echo "API Gateway URL: ${API_URL}"
  if [ -n "$FRONTEND_URL" ]; then
    echo "Frontend URL:    ${FRONTEND_URL}"
  fi
else
  echo "==> Deployment complete!"
  echo ""
  echo "NOTE: Could not read CDK outputs file."
fi
