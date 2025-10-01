const request = require("supertest");
const app = require("./service");

test("Returns welcome at root", async () => {
  const response = await request(app).get("/");
  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({
      message: "welcome to JWT Pizza",
      version: expect.any(String),
    })
  );
});

test("Returns docs", async () => {
  const response = await request(app).get("/api/docs");
  expect(response.status).toBe(200);
  expect(response.body).toBeDefined();
});

test("Returns 404 on unknown endpoint", async () => {
  const response = await request(app).get("/unknown-endpoint");
  expect(response.status).toBe(404);
  expect(response.body).toEqual(
    expect.objectContaining({
      message: "unknown endpoint",
    })
  );
});
