import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("Explorer API proxy path hardening", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects path segments that could escape the API namespace", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const unsafePaths = [
      ["..", "health"],
      [".", "status"],
      ["blocks", "../status"],
      ["blocks", "\\status"],
    ];

    for (const path of unsafePaths) {
      const response = await GET(new NextRequest("http://localhost/api/explorer/mainnet/status"), {
        params: Promise.resolve({
          network: "mainnet",
          path,
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toEqual({
        error: "invalid_path",
        message: "Explorer API path is invalid",
      });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
