#!/bin/bash
cd /home/kavia/workspace/code-generation/storetrack-inventory-system-95286-c1e64421/inventory_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

