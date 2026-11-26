FROM eclipse-temurin:21-jdk

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin oj

WORKDIR /workspace

ENV HOME=/tmp
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC"

USER 10001:10001
