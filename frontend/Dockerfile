# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Expression content for the prerendered SEO pages. It lives in the backend, so it comes from a named
# build context: docker build --build-context content=backend/data/expressions frontend
COPY --from=content . /content
ENV CONTENT_DIR=/content
RUN npm run build

# ---- runtime ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
