import app from "../../server/index";

export default function handler(request, response) {
  request.url = request.url.replace(/^\/api/, "") || "/";
  return app(request, response);
}