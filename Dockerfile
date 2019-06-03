FROM node:8.16.0-alpine

ENV reports_dir /reports
ENV work_dir /sm-topline-status

WORKDIR $work_dir

RUN mkdir $reports_dir && \
    chown node:node $reports_dir && \
    chown node:node $work_dir

USER node

COPY package.json ./
COPY Gruntfile.coffee ./

RUN npm install

COPY . .
