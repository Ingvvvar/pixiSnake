#!/bin/bash
set -e
npm run build
rsync -avz --delete dist/ vps:/var/www/snake/
ssh vps "chmod -R a+rX /var/www/snake"
echo "✅ Deployed: https://45.94.156.161.nip.io"
