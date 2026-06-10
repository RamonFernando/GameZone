import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "./validation";

const schema = z.object({
  email: z.string().optional(),
  quantity: z.number().optional(),
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseJsonBody", () => {
  it("acepta un body válido y devuelve los datos tipados", async () => {
    const result = await parseJsonBody(jsonRequest({ email: "a@b.com", quantity: 2 }), schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("a@b.com");
      expect(result.data.quantity).toBe(2);
    }
  });

  it("rechaza un campo con tipo equivocado (400 VALIDATION_ERROR)", async () => {
    const result = await parseJsonBody(jsonRequest({ quantity: "no-soy-numero" }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("rechaza un body que no es objeto (array)", async () => {
    const result = await parseJsonBody(jsonRequest([1, 2, 3]), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rechaza JSON inválido con 400 BAD_REQUEST", async () => {
    const badReq = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ esto no es json",
    });
    const result = await parseJsonBody(badReq, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
