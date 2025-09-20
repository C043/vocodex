# syntax=docker/dockerfile:1
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
# Code bind-mounted; node_modules lives in container
