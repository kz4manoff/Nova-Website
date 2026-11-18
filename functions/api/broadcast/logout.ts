import {
  buildSessionCookieHeader,
  jsonResponse,
} from "../../../server/broadcast/cryptoAuth";

export const onRequestPost = async ({
  request,
}: {
  request: Request;
}): Promise<Response> => {
  return jsonResponse(
    { authenticated: false },
    200,
    {
      "Set-Cookie": buildSessionCookieHeader("", request, 0),
    }
  );
};
