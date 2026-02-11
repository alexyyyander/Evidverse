import { describe, expect, it } from "vitest";
import { normalizeAxiosError } from "@/lib/api/errors";

describe("normalizeAxiosError", () => {
  it("normalizes string detail message", () => {
    const err = {
      response: { status: 400, data: { detail: "Bad request" } },
    } as any;

    const normalized = normalizeAxiosError(err);
    expect(normalized.message).toBe("Bad request");
    expect(normalized.status).toBe(400);
  });

  it("normalizes validation error array into fieldErrors", () => {
    const err = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ["body", "email"], msg: "Invalid email" },
            { loc: ["body", "password"], msg: "Too short" },
          ],
        },
      },
    } as any;

    const normalized = normalizeAxiosError(err);
    expect(normalized.message).toBe("Validation error");
    expect(normalized.status).toBe(422);
    expect(normalized.fieldErrors).toEqual({
      "body.email": "Invalid email",
      "body.password": "Too short",
    });
  });
});

