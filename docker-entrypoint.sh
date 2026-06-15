#!/bin/sh
set -eu

if [ -f "./prisma/schema.prisma" ]; then
  npx prisma migrate deploy
fi

exec node dist/server.cjs
