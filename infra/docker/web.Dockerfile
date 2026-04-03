FROM node:22-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY tsconfig.base.json /app/tsconfig.base.json
COPY packages/shared /app/packages/shared
COPY apps/web /app/apps/web

RUN npm install
RUN npm run build --workspace @cyber-sim/web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@cyber-sim/web"]
