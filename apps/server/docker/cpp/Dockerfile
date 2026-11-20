FROM gcc:13-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends time \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

USER 10001:10001
