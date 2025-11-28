FROM node:18-bullseye

# Instalar dependencias de sistema para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    gconf-service \
    libgbm1 \
    libgconf-2-4 \
    libgbm-dev \
    libgconf-full-dev \
    libgtk-3-0 \
    libxss1 \
    libxss-dev \
    fonts-liberation \
    libappindicator1 \
    libappindicator3-1 \
    libindicator7 \
    lsb-release \
    xdg-utils \
    wget \
    libnss3 \
    libnss3-dev \
    libdbus-1-dev \
    libgconf-2-4 \
    libgconf-full-dev \
    libxrandr2 \
    libxrandr-dev \
    libxinerama1 \
    libxinerama-dev \
    libxi6 \
    libxi-dev \
    libxcursor1 \
    libxcursor-dev \
    libxtst6 \
    libxtst-dev \
    libc6 \
    ca-certificates \
    fonts-dejavu-core \
    fontconfig \
    libpango-1.0-0 \
    libpango-1.0-common \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias Node
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Puerto (no usado, pero buena práctica)
EXPOSE 3000

# Iniciar bot
CMD ["npm", "start"]
