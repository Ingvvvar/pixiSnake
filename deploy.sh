#!/bin/bash
set -e
npm run build
rsync -avz --delete dist/ vps:/tmp/snake/
ssh vps "sudo cp -r /tmp/snake/* /var/www/snake/ && sudo chmod -R a+rX /var/www/snake"
echo "✅ Deployed: https://45.94.156.161.nip.io"
