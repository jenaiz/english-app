# ---- build ----
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/server /app/server
COPY data /app/data
ENV PORT=8080 CONTENT_DIR=/app/data/levels
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://localhost:8080/healthz || exit 1
ENTRYPOINT ["/app/server"]
