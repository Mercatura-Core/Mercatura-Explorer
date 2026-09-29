import { afterEach, describe, expect, it } from "vitest";

import { buildApi } from "./app.js";

describe("Mercatura Explorer API", () => {
  const apps: ReturnType<typeof buildApi>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("serves the health endpoint", async () => {
    const app = buildApi();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "mercatura-explorer-api",
    });
  });
});

describe("Mercatura Explorer API errors", () => {
  it("returns a consistent JSON response for unknown routes", async () => {
    const app = buildApi();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/does-not-exist",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "not_found",
        message: "Route not found",
      });
    } finally {
      await app.close();
    }
  });
});
