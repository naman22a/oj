FROM python:3.13-slim

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin oj

WORKDIR /workspace

ENV HOME=/tmp
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 10001:10001
