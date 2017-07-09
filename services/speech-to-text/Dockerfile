FROM node:8

RUN mkdir /service
RUN mkdir /service/input
RUN mkdir /service/ouput
RUN mkdir /service/node_modules

COPY credentials.json /service/credentials.json
COPY index.js /service/index.js

ENV HTTP_PORT=8080
ENV INPUT_DIRECTORY=/service/input
ENV OUTPUT_DIRECTORY=/service/output

VOLUME /service/node_modules
VOLUME /service/input
VOLUME /service/ouput

WORKDIR /service

CMD ["node", "./index.js"]
