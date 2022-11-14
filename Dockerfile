FROM node:16

ADD . /home/tribe3/tribe3-api
WORKDIR /home/tribe3/tribe3-api

ARG API_DATABASE_URL
ENV DATABASE_URL=${API_DATABASE_URL}
RUN npm install
RUN npx prisma generate

ENV NODE_ENV production
ENV ENV production
EXPOSE 3001
CMD ["npm", "run", "start"]