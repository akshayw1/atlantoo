FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install uuid



COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]