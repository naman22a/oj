FROM node:24-bookworm-slim

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin oj

WORKDIR /workspace

ENV HOME=/tmp
ENV NODE_ENV=production

USER 10001:10001
