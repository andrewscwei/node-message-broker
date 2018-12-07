###
# Base Node.js image.
##
FROM node:10.14.1 as build-env


## Build
# Install dev dependencies and build the app.
##

FROM build-env as build

WORKDIR /var/app

ADD package.json /var/app/
ADD src /var/app/src
ADD tsconfig.json /var/app/
ADD tslint.json /var/app/
ADD package-lock.json /var/app/

RUN npm install
RUN npm run build


## Test
# Test the app.
##

FROM build as test

WORKDIR /var/app

RUN sed -i '/"\*\*\/\*\.spec\.ts"/d' ./tsconfig.json
RUN npm run build

CMD npm run test
