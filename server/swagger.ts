// tslint:disable-next-line:no-var-requires
const swaggerJSDoc = require('swagger-jsdoc');

// swagger definition
const swaggerDefinition = {
    info: {
        title: 'Sentifi Graph API',
        version: '1.0.0'
    },
    host: 'https://sentifi.herokuapp.com/',
    basePath: '/api'
};

// options for the swagger docs
const options = {
    // import swaggerDefinitions
    swaggerDefinition,
    // path to the API docs
    apis: ['./**/controllers/*.ts'] // pass all in array
};

// initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);
console.log(swaggerSpec);
