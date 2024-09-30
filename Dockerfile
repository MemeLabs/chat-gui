FROM node:14-alpine AS build

RUN mkdir /ui
WORKDIR /ui

COPY assets ./assets
COPY scripts ./scripts
COPY \
  .babelrc \
  .eslintignore \
  .eslintrc.js \
  package-lock.json \
  package.json \
  postcss.config.js \
  robots.txt \
  tsconfig.json \
  webpack.config.js \
  ./

ARG ENV_SRC=".env.prod"
COPY ${ENV_SRC} .env

RUN npm install
RUN npm run build:production

FROM nginx:stable-alpine

COPY --from=build /ui/static /usr/share/nginx/html/
