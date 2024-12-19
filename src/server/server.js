require('dotenv').config();
const Hapi = require('@hapi/hapi');
const routes = require('./routes');
const InputError = require('../exceptions/InputError');

(async () => {
  const server = Hapi.server({
    port: {backend_port},
    host: {backend_host},
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register(require('@hapi/cookie'));

  server.state('token', {
    ttl: 60 * 60 * 1000,
    isSecure: process.env.NODE_ENV === 'production',
    isHttpOnly: true,
    path: '/',
    encoding: 'base64json',
  });

  server.route(routes);

  server.ext('onPreResponse', function (request, h) {
    const response = request.response;

    if (response instanceof InputError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    if (response.isBoom) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.output.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server started at: ${server.info.uri}`);
})();
