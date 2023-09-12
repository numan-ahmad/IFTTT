const jwt = require('jsonwebtoken');
const { HttpException } = require('http-exceptions'); // You may need to install this library

function UnauthorizedException(detail, kwargs) {
    // Returns HTTP 403
    return new HttpException(403, detail, kwargs);
}

class VerifyToken {
    constructor() {
        // This gets the JWKS from a given URL and does processing so you can
        // use any of the keys available
        const jwks_url = `https://${process.env.auth0_domain}/.well-known/jwks.json`;
        this.jwks_client = new jwt.JwksClient({
            jwksUri: jwks_url,
        });
    }

    async verify(security_scopes, token) {
        if (!token) {
            throw UnauthorizedException();
        }

        // This gets the 'kid' from the passed token
        try {
            const key = await this.jwks_client.getSigningKey(token.credentials);
            var signing_key = key.getPublicKey();
        } catch (error) {
            throw UnauthorizedException(error.message);
        }

        try {
            var payload = jwt.verify(token.credentials, signing_key, {
                algorithms: process.env.auth0_algorithms,
                audience: process.env.auth0_api_audience,
                issuer: process.env.auth0_issuer,
            });
        } catch (error) {
            throw UnauthorizedException(error.message);
        }

        if (security_scopes.scopes.length > 0) {
            this._checkClaims(payload, 'scope', security_scopes.scopes);
        }

        return payload;
    }

    _checkClaims(payload, claimName, expectedClaims) {
        const claims = Array.isArray(payload[claimName]) ? payload[claimName] : [payload[claimName]];
        const missingClaims = expectedClaims.filter((claim) => !claims.includes(claim));

        if (missingClaims.length > 0) {
            throw UnauthorizedException(`Missing required ${claimName}: ${missingClaims.join(', ')}`);
        }
    }
}
