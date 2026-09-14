# Zero-dependency Node 22 service. No build step, no package.json.
FROM node:22-alpine

WORKDIR /app

# Copy source. .cache holds runtime-fetched terrain and icons; it is excluded by
# .dockerignore and repopulated on first run.
COPY server.js ./
COPY lib/ ./lib/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY README.md ./

# The service has no authentication, so binding is an explicit decision. Inside a
# container it must be 0.0.0.0 to be reachable; publish the port only to a
# trusted network and put a reverse proxy (with TLS and auth) in front of it.
ENV HOST=0.0.0.0
ENV PORT=8787

# The terrain mosaic and icon cache are written here; mount a volume to keep
# them across restarts (see docs/DEPLOYMENT_AND_OPS.md).
VOLUME ["/app/.cache"]

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
