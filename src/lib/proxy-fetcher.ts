// Source of the proxy dataset bundled with the Cloudflare Pages deployment.
// proxy-collector mirrors the latest checked results into public/data.
// Keeping this as a relative path means the browser reads directly from the
// same Pages deployment with no Function, Worker, or GitHub Raw request.
export const REPO_RAW = "/data";
