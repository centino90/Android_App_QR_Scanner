#!/bin/sh

# docker-compose -f "./backend/docker-compose.yaml" down -v;
# docker-compose -f "./backend/docker-compose.yaml" up --build -d;
nvm install 20.9.0;
nvm use 20.9.0;
cd backend;
sleep 5;
npm install;
sleep 5;
npx sequelize-cli db:migrate:undo:all;
npx sequelize-cli db:migrate;
npx sequelize-cli db:seed:all;
sleep 5;
npm run start:watch;