FROM node:25.2.1-bookworm

WORKDIR /app

COPY ./ ./

RUN npm install

CMD ["npm", "run", "dev"]

