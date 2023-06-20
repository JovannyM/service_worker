FROM node:18-alpine AS build

WORKDIR /src

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm install typescript -g
RUN tsc

CMD ["node", "dist/main"]
