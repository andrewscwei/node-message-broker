## Build
# Install dev dependencies and build the app.
##

FROM node:10.12.0 as build

WORKDIR /var/app

ADD package.json /var/app/
ADD src /var/app/src
ADD tsconfig.json /var/app/
ADD tslint.json /var/app/
ADD yarn.lock /var/app/

RUN yarn
RUN npm run build


## Test
# Test the app.
##

FROM build as test

WORKDIR /var/app

RUN sed -i '/"src\/tests\/\*\*\/\*"/d' ./tsconfig.json

CMD npm run test

