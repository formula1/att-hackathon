FROM node:8

ENV HTTP_PORT=80
ENV INPUT_DIRECTORY=/service/input
ENV OUTPUT_DIRECTORY=/service/output


RUN mkdir /service
RUN mkdir /service/node_modules

VOLUME /service
VOLUME /service/node_modules

WORKDIR /service

expose 80

CMD ["node", "./index.js"]
