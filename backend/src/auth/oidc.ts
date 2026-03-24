import * as client from "openid-client";
import session from "express-session";
import {
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_ISSUER,
  OIDC_REDIRECT_URI,
} from "../env.js";
import type { OidcUserProfile } from "./types.js";

const OIDC_SESSION_TTL_MS = 10 * 60 * 1_000;
const OIDC_SCOPE = "openid profile email";

let oidcConfigurationPromise: Promise<client.Configuration> | undefined;

const NORMALIZED_OIDC_ISSUER = OIDC_ISSUER.trim().endsWith("/")
  ? OIDC_ISSUER.trim()
  : `${OIDC_ISSUER.trim()}/`;

function getClaimString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

async function getOidcConfiguration() {
  if (!oidcConfigurationPromise) {
    console.log("OIDC issuer runtime =", NORMALIZED_OIDC_ISSUER);

    oidcConfigurationPromise = client.discovery(
      new URL(NORMALIZED_OIDC_ISSUER),
      OIDC_CLIENT_ID,
      {
        client_secret: OIDC_CLIENT_SECRET,
        redirect_uris: [OIDC_REDIRECT_URI],
        response_types: ["code"],
      },
      client.ClientSecretPost(OIDC_CLIENT_SECRET),
    );
  }

  return oidcConfigurationPromise;
}

export async function buildLoginRedirect(sessionData: session.SessionData) {
  const config = await getOidcConfiguration();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  sessionData.oidc = {
    code_verifier: codeVerifier,
    state,
    created_at: Date.now(),
  };

  const redirectTo = client.buildAuthorizationUrl(config, {
    redirect_uri: OIDC_REDIRECT_URI,
    response_type: "code",
    scope: OIDC_SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return redirectTo.toString();
}

export async function handleOidcCallback(
  currentUrl: URL,
  sessionData: session.SessionData,
): Promise<OidcUserProfile> {
  const pendingLogin = sessionData.oidc;
  if (!pendingLogin) {
    throw new Error("Missing OIDC login session");
  }

  if (Date.now() - pendingLogin.created_at > OIDC_SESSION_TTL_MS) {
    throw new Error("OIDC login session expired");
  }

  const config = await getOidcConfiguration();
  console.log("config: ", config.clientMetadata().client_id);
  const tokens = await client.authorizationCodeGrant(
    config,
    currentUrl,
    {
      expectedState: pendingLogin.state,
      pkceCodeVerifier: pendingLogin.code_verifier,
      idTokenExpected: true,
    },
    {
      redirect_uri: OIDC_REDIRECT_URI,
    },
  );

  const claims = tokens.claims();
  if (!claims) {
    throw new Error("OIDC callback did not return ID token claims");
  }
  const accessToken = tokens.access_token;
  if (!accessToken) {
    throw new Error("OIDC callback did not return an access token");
  }

  const userInfo = await client.fetchUserInfo(config, accessToken, claims.sub);
  const sub = getClaimString(userInfo.sub, claims.sub);
  if (!sub) {
    throw new Error("OIDC user profile is missing sub");
  }

  const email =
    getClaimString(
      userInfo.email,
      claims.email,
      userInfo.preferred_username,
      claims.preferred_username,
    ) || `${sub}@local.jarvis`;

  return {
    sub,
    email,
    display_name: getClaimString(
      userInfo.name,
      claims.name,
      userInfo.preferred_username,
      claims.preferred_username,
      email,
    ),
  };
}
