import assert from "node:assert/strict";
import { resolveUploadThingCallbackUrl } from "../src/uploadthing-callback-url.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("uploadthing-callback-url", () => {
  assert.equal(
    resolveUploadThingCallbackUrl({
      NODE_ENV: "production",
      APP_URL: "https://axelmond.com",
      UPLOADTHING_CALLBACK_URL: "https://www.axelmond.com/api/uploadthing",
    }),
    "https://axelmond.com/api/uploadthing",
  );

  assert.equal(
    resolveUploadThingCallbackUrl({
      NODE_ENV: "production",
      APP_URL: "https://axelmond.com/",
      UPLOADTHING_CALLBACK_URL: "http://localhost:3000/api/uploadthing",
    }),
    "https://axelmond.com/api/uploadthing",
  );

  assert.equal(
    resolveUploadThingCallbackUrl({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      UPLOADTHING_CALLBACK_URL: "http://127.0.0.1:3001/api/uploadthing",
    }),
    "http://127.0.0.1:3001/api/uploadthing",
  );

  assert.equal(resolveUploadThingCallbackUrl({ NODE_ENV: "production", APP_URL: "not-a-url" }), undefined);
});
