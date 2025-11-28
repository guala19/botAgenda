FROM node:18-bullseye

# Instalar dependencias mínimas para Puppeteer/Chromium en Linux
# Basado en: https://github.com/puppeteer/puppeteer/blob/main/docker/Dockerfile
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias Node (sin dev)
RUN npm ci --omit=dev

# Copiar código fuente y credenciales
COPY . .

# Establecer variable por defecto que apunta al archivo JSON dentro del contenedor
# (Railway puede sobrescribir con su propia variable si lo requiere)
ENV GOOGLE_SERVICE_ACCOUNT_JSON=./botagenda-478614-e2daa61b626a.json

# Puerto (no usado, pero buena práctica)
EXPOSE 3000

# Iniciar bot
CMD ["npm", "start"]

