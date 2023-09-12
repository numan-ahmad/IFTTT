const express = require("express");
const cors = require("cors");
const http = require("http");
const listEndpoints = require("express-list-endpoints");
const _ = require("lodash");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const axios = require("axios");
const jwksRsa = require('jwks-rsa');
const jsonWebToken = require('jsonwebtoken'); 
const listAllEndpoints = (app) => {
  const endpoints = listEndpoints(app);

  const flatEndpoints = _.chain(endpoints)
    .map((ep) => {
      if (ep.path !== "*")
        return ep.methods.map(
          (method) => `${method.padEnd(6, " ")} ${ep.path}`
        );
      return [];
    })
    .flatten()
    .value();

  console.log(flatEndpoints);
};

const promiseApp = async () => {
  return new Promise((resolve, reject) => {
    var app = express();
    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use(express.static("."));

    const IFTTT_SERVICE_KEY =
      "HCHrAO48Id7QcRUn7Wd8PkX4GgYSTteUuB2Kqaw1XJtYzZKEn1CTP87DFfNYRV_T";

    const checkServiceKey = (req, res, next) => {
      const IFTTT_Service_Key = req.header("IFTTT-Service-Key");

      if (IFTTT_Service_Key !== IFTTT_SERVICE_KEY) {
        res.status(401).json({ errors: [{ message: "Unauthorized" }] });
      }

      next();
    };
    const checkJwt = jsonWebToken({
      // Dynamically fetch Auth0's public key from JWKS endpoint
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://dev-djl8wltru7k2y7t3.us.auth0.com/.well-known/jwks.json`, // Replace with your Auth0 domain
      }),
      audience: "ifttt-airbolt-app", // Replace with your API identifier
      issuer: `https://dev-djl8wltru7k2y7t3.us.auth0.com/`, // Replace with your Auth0 domain
      algorithms: ["RS256"],
    });

    // Middleware to fetch user details
    app.use(async (req, res, next) => {
      try {
        console.log('00000000000000000000000000', req.header.authorization)
        // Fetch user details from Auth0 using the user's sub (subject) claim
        const response = await axios.get(`https://dev-djl8wltru7k2y7t3.us.auth0.com/userinfo`, {
          headers: {
            Authorization: req.headers.authorization,
          },
        });

        // Attach user details to the request object
        req.user = response.data;
        next();
      } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
      }
    });

    // Define your routes here using Express.js
    app.use(checkServiceKey);
    app.get("/ifttt/v1/status", checkServiceKey, async (req, res) => {
      res.json({ data: "IFTTT API is up" });
    });

    app.post("/ifttt/v1/test/setup", checkServiceKey, async (req, res) => {
      res.status(200).json({ data: { status: "success" } });
    });

    app.post("/ifttt/v1/user/info", checkJwt, async (req, res) => {
      res.status(200).json({ data: { status: "success" } });
    });
    // app.post('/ifttt/v1/test/setup', checkServiceKey, async(req, res) => {
    //   res.json({ data: {body: req.body} });
    // });

    app.post(
      "/ifttt/v1/triggers/new_thing_created",
      checkServiceKey,
      (req, res) => {
        console.log(
          req.body,
          "3866666666666666666666666666666666666612321838172"
        );
        var limit =
          req.body?.limit !== undefined &&
          req.body?.limit !== null &&
          req.body?.limit !== ""
            ? req.body?.limit
            : 50; // IF limit is present, just send that much
        if (limit == 1) {
          res.json({
            data: [
              {
                h: 1,
                h2: 3,
                cursor: "cursor",
              },
            ],
            cursor: "2",
            limit,
          });
        } else if (limit == 0) {
          res.json({ data: [] });
        }
        var myData = [];
        for (var i = 0; i < 3; i++) {
          var myObj = {};
          var meta = {
            id: i,
            key: i + 2,
            timestamp: 1693602378,
          };
          var created_at = new Date();
          myObj["meta"] = meta;
          myObj["created_at"] = created_at.toISOString();
          myData.push(myObj);
        }
        // reverse to send data ordered by timestamp descending
        res.status(200).json({ data: myData.reverse() });
      }
    );

    app.post(
      "/ifttt/v1/queries/list_all_things",
      checkServiceKey,
      (req, res) => {
        res.json({
          data: [
            {
              h: 1,
              h2: 3,
              cursor: "cursor",
            },
          ],
          cursor: "2",
          limit: 1,
        });
      }
    );

    app.post(
      "/ifttt/v1/actions/create_new_thing",
      checkServiceKey,
      (req, res) => {
        res.json({
          data: [
            {
              id: 1,
              url: "http://example.com/96d98143668806b6",
            },
          ],
        });
      }
    );

    // const AccessToken =
    //   "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik4wcWJ0bTZ4NV8zSHk0eGp4YS1TZCJ9.eyJpc3MiOiJodHRwczovL2Rldi1kamw4d2x0cnU3azJ5N3QzLnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw2NGYwN2U4YjBmMTQxMzUxOWE2YWJjNmQiLCJhdWQiOlsiaWZ0dHQtYWlyYm9sdC1hcHAiLCJodHRwczovL2Rldi1kamw4d2x0cnU3azJ5N3QzLnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE2OTM1NTQwNDYsImV4cCI6MTY5NjE0NjA0NiwiYXpwIjoiOHVZOHBTNG9vZWh2V0I4WHR4cDUxTTg5VGY2b0VGU2QiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG9mZmxpbmVfYWNjZXNzIn0.jgznYJAif0yxEEOxv2QKB5HVyiuB-J5Fkkfqf_A2f1MlaW7UQEOgSh7EsnzZLqZ27-KGw3LDb8F0yAeJj15_xWZBZ-mErgnTZ_cieJ_uG6dIIVJAw0V8BoQdkS-S39xk7-rh1KZRuTkafKgwQ-6HFDJ1GpIYhMdeHkWP5V_lFO0kBW1hRfmV8doo9DOHinhsQoUYsr66IjFFWoaHrIyxipBN2hhqvjJ12drbYsjnYlCF301k6T1SSXTwd3U2elbPYRznSq5clBtEpxxPzccI4xKidA8-HO_0lWgrGKdA-NdOIEe_k6hxAYw5AB0h3nWkJkbLkuHs4FZCSokZQe4uvg";
    // const checkAccessKey = (req, res, next) => {
    //   const accessToken = req.headers["authorization"];

    //   if (accessToken !== AccessToken) {
    //     res.status(401).json({ errors: [{ message: "Unauthorized" }] });
    //   }
    //   next();
    // };

    // app.get("/ifttt/v1/user/info", checkAccessKey, async (req, res) => {
    //   res.json({ message: "IFTTT API is up" });
    // });

    // app.get('/test', async (req, res) => {
    //   await instance.post('/testing/json/with/key/lRU2t4pls4uhsS8dSdqZddtFyDwWkWzzleymeUs2rkq', {"value1":"321","value2":"3213","value3":"321312"});

    //   res.json({ success: true, message: 'Success' });
    // });
    app.use((req, res, next) => {
      const error = new Error("not found");
      error.status = 404;
      next(error);
    });

    app.use((error, req, res, next) => {
      res.status(error.status || 500);
      res.json({
        error: {
          message: error.message,
        },
      });
    });

    listAllEndpoints(app);

    resolve(app);
  });
};

const promiseServer = async (app) => {
  return new Promise((resolve, reject) => {
    const server = http.Server(app);
    resolve(server);
  });
};

const promiseRun = (server) => {
  return new Promise((resolve, reject) => {
    server.listen(9000, () => {
      console.log("Server started and listening on the port 9000");
      resolve();
    });
  });
};

async function initialize() {
  const app = await promiseApp();
  const server = await promiseServer(app);
  console.log("Server initialized.");

  await promiseRun(server);
}

initialize();
