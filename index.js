const express = require("express");
const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
let accessToken = "";

// Define Auth0 configuration
const auth0Config = {
  domain: "dev-djl8wltru7k2y7t3.us.auth0.com", // Replace with your Auth0 domain
  audience: "ifttt-airbolt-app", // Replace with your Auth0 API Identifier
};
const IFTTT_SERVICE_KEY =
  "HCHrAO48Id7QcRUn7Wd8PkX4GgYSTteUuB2Kqaw1XJtYzZKEn1CTP87DFfNYRV_T";

const checkServiceKey = (req, res, next) => {
  const IFTTT_Service_Key = req.header("IFTTT-Service-Key");

  if (IFTTT_Service_Key !== IFTTT_SERVICE_KEY) {
    return res.status(401).json({ errors: [{ message: "Unauthorized" }] });
  }

  next();
};
// Create a JWKS client to fetch the public key
const jwksClientInstance = jwksRsa({
  jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
});

async function getAccessToken() {
  try {
    // Get an Auth0 access token using the Client Credentials Grant
    const auth0TokenUrl = `https://${auth0Config.domain}/oauth/token`;
    const response = await axios.post(
      auth0TokenUrl,
      {
        grant_type: "client_credentials",
        client_id: "8uY8pS4ooehvWB8Xtxp51M89Tf6oEFSd",
        client_secret:
          "lw06lLLtuI5c6WFpmMG5ommfA3HZPkqVOqA5GUz-Yvo4t7Bnk2oSSXAfgxtLKM0I",
        audience: auth0Config.audience,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { access_token } = response.data;
    return access_token;
  } catch (error) {
    console.error("Error obtaining access token:", error);
    throw error;
  }
}

// Middleware to extract and verify the Bearer token
const checkAccessKey = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ errors: [{ message: "Unauthorized" }] });
  }

  const jwtToken = token.split("Bearer ")[1];

  accessToken = jwtToken;

  // Verify the Auth0 token
  jwt.verify(
    jwtToken,
    (header, callback) => {
      jwksClientInstance.getSigningKey(header.kid, (err, key) => {
        if (err) {
          callback(err);
        } else {
          const signingKey = key.publicKey || key.rsaPublicKey;
          callback(null, signingKey);
        }
      });
    },
    {
      audience: auth0Config.audience,
      issuer: `https://${auth0Config.domain}/`,
      algorithms: ["RS256"],
    },
    (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ errors: [{ message: "Unauthorized" }] });
      } else {
        // Store the decoded token in the request object for use in your route
        req.decodedToken = decodedToken;
        next();
      }
    }
  );
};

// API route that requires JWT token validation
app.get("/ifttt/v1/user/info", checkAccessKey, async (req, res) => {
  const token = req.header("Authorization");
  try {
    // Make a request to Auth0's userinfo endpoint using the access token
    const response = await axios.get(`https://${auth0Config.domain}/userinfo`, {
      headers: {
        Authorization: token,
      },
    });

    const userinfo = response.data;
    res.status(200).json({
      data: { status: "success", id: userinfo.sub, name: userinfo.name },
    });
  } catch (error) {
    console.error("Error fetching userinfo:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/ifttt/v1/status", checkServiceKey, async (req, res) => {
  return res.status(200).json({ data: "IFTTT API is up" });
});

app.post("/ifttt/v1/test/setup", checkServiceKey, async (req, res) => {
  return res.status(200).json({ data: { status: "success", accessToken } });
});

app.post("/ifttt/v1/triggers/sos_alert", checkServiceKey, async (req, res) => {
  var limit =
    req.body?.limit !== undefined &&
    req.body?.limit !== null &&
    req.body?.limit !== ""
      ? req.body?.limit
      : 50; // IF limit is present, just send that much
  if (limit == 1) {
    return res.json({
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
    return res.json({ data: [] });
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
  return res.status(200).json({ data: myData.reverse() });
});

app.post("/ifttt/v1/queries/list_all_things", checkServiceKey, (req, res) => {
  return res.status(200).json({
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
});

const port = process.env.PORT || 9000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
