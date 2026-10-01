import { afterEach, describe, expect, it, vi } from "vitest";

import { MercaturaRpcClient } from "./client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MercaturaRpcClient timeout", () => {
  it("aborts stalled RPC requests after the configured timeout", async () => {
    const fetchMock = vi.fn(
      (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;

          if (signal === undefined || signal === null) {
            reject(new Error("RPC request did not include an abort signal"));
            return;
          }

          const rejectForAbort = () => {
            reject(
              signal.reason instanceof Error ? signal.reason : new Error("RPC request aborted")
            );
          };

          if (signal.aborted) {
            rejectForAbort();
            return;
          }

          signal.addEventListener("abort", rejectForAbort, { once: true });
        })
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = new MercaturaRpcClient({
      url: "http://127.0.0.1:27773",
      credentials: {
        username: "test",
        password: "test",
      },
      timeoutMs: 20,
    });

    await expect(client.getNetworkInfo()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid timeout values", () => {
    expect(
      () =>
        new MercaturaRpcClient({
          url: "http://127.0.0.1:27773",
          credentials: {
            username: "test",
            password: "test",
          },
          timeoutMs: 0,
        })
    ).toThrow("Mercatura RPC timeout must be a positive integer");
  });
});
