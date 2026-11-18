import {
  checkServerConfigStatus,
  jsonResponse,
  verifySessionFromRequest,
  type BroadcastEnv,
} from "../../../server/broadcast/cryptoAuth";

export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  const session = await verifySessionFromRequest(request, env);
  const config = await checkServerConfigStatus(env);

  return jsonResponse({
    authenticated: session.valid,
    expiresAt: session.valid ? session.expiresAt : null,
    config,
  });
};
