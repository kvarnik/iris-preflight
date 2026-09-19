# syntax=docker/dockerfile:1

FROM node:20-alpine AS web
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
WORKDIR /app/web
RUN npm ci
WORKDIR /app
COPY web ./web
COPY src/data ./src/data
WORKDIR /app/web
RUN npm run build

FROM intersystemsdc/iris-community:latest-cd
WORKDIR /home/irisowner/dev

COPY --chown=${ISC_PACKAGE_MGRUSER}:${ISC_PACKAGE_IRISGROUP} src ./src
COPY --chown=${ISC_PACKAGE_MGRUSER}:${ISC_PACKAGE_IRISGROUP} iris.script module.xml ./
COPY --from=web --chown=${ISC_PACKAGE_MGRUSER}:${ISC_PACKAGE_IRISGROUP} /app/web/dist ./dist

RUN iris start IRIS \
 && iris session IRIS < iris.script \
 && iris stop IRIS quietly
