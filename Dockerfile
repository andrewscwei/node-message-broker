###
# Base Node.js image.
##
FROM node:17.5.0 as build-env


## Build
# Install dev dependencies and build the app.
##

FROM build-env as build

WORKDIR /var/app

ADD package*.json /var/app/
ADD src /var/app/src
ADD ts*.json /var/app/
COPY .eslintrc /var/app/

RUN npm install
RUN npm run build


## Test
# Test the app.
##

FROM build as test

WORKDIR /var/app

RUN npm run build:test

CMD npm test
