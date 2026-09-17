# Repo kökünden: docker build -f api_backend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY api_backend/package.json api_backend/package-lock.json* ./
RUN npm ci
COPY api_backend/tsconfig.json ./
COPY api_backend/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV CURRICULUM_ROOT=/app/assets/data/curriculum
COPY api_backend/package.json api_backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY assets/data/curriculum ./assets/data/curriculum
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
