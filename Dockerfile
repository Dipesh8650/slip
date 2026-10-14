FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM node:24-bookworm-slim AS backend-dependencies
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 python3-venv libpq5 ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=3000
RUN python3 -m venv /opt/venv
COPY backend/requirements.txt /tmp/slip-requirements.txt
RUN pip install --no-cache-dir -r /tmp/slip-requirements.txt \
    && rm /tmp/slip-requirements.txt
WORKDIR /app/backend
COPY --chown=node:node backend/ ./
COPY --from=backend-dependencies --chown=node:node \
    /build/backend/node_modules ./node_modules
COPY --from=frontend-build --chown=node:node \
    /build/frontend/dist ./public
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "start.mjs"]
