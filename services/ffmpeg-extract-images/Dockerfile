FROM ubuntu:16.04

RUN apt-get update --fix-missing
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:jonathonf/ffmpeg-3
RUN apt-get update --fix-missing
RUN apt-get dist-upgrade -y
RUN apt-get install -y ffmpeg nodejs npm

RUN npm install -g n
RUN apt-get install -y curl
RUN n v8.1.3


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
