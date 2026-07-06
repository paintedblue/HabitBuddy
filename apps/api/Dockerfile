FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npx tsc packages/shared/src/index.ts --target ES2022 --module commonjs --moduleResolution node --declaration --outDir packages/shared/dist --esModuleInterop --skipLibCheck
RUN npm --workspace apps/api run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/uploads apps/api/uploads
COPY --from=build /app/packages/shared packages/shared
RUN node -e "const fs=require('fs'); const path='packages/shared/package.json'; const pkg=JSON.parse(fs.readFileSync(path,'utf8')); pkg.main='./dist/index.js'; pkg.types='./dist/index.d.ts'; delete pkg.type; fs.writeFileSync(path, JSON.stringify(pkg, null, 2));"
CMD ["node", "apps/api/dist/src/main.js"]
