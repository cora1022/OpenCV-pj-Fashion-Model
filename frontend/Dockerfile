FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/run
USER app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
