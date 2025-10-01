const request = require("supertest");
const app = require("../service");

test("Register a new user", async () => {
  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });

  expect(registerUserResp.status).toBe(200);
  expect(registerUserResp.body).toHaveProperty("user");
  expect(registerUserResp.body).toHaveProperty("token");
});

test("Register requires name", async () => {
  const registerUserResp = await request(app).post("/api/auth").send({
    email: "test@example.com",
    password: "password123",
  });

  expect(registerUserResp.status).toBe(400);
  expect(registerUserResp.body).toEqual(
    expect.objectContaining({
      message: "name, email, and password are required",
    })
  );
});

test("Register requires email", async () => {
  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    password: "password123",
  });

  expect(registerUserResp.status).toBe(400);
  expect(registerUserResp.body).toEqual(
    expect.objectContaining({
      message: "name, email, and password are required",
    })
  );
});

test("Register requires password", async () => {
  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    email: "test@example.com",
    password: "",
  });

  expect(registerUserResp.status).toBe(400);
  expect(registerUserResp.body).toEqual(
    expect.objectContaining({
      message: "name, email, and password are required",
    })
  );
});

test("Login with existing user", async () => {
  const loginResp = await request(app).put("/api/auth").send({
    email: "test@example.com",
    password: "password123",
  });

  expect(loginResp.status).toBe(200);
  expect(loginResp.body).toHaveProperty("user");
  expect(loginResp.body).toHaveProperty("token");
});

test("Errors on wrong password", async () => {
  const loginResp = await request(app).put("/api/auth").send({
    email: "test@example.com",
    password: "wrongpassword",
  });

  expect(loginResp.status).toBe(404);
  expect(loginResp.body).toEqual(
    expect.objectContaining({
      message: "unknown user",
    })
  );
});

test("Logout with valid token", async () => {
  const registerResp = await request(app).post("/api/auth").send({
    name: "Logout User",
    email: "logout@example.com",
    password: "password123",
  });
  expect(registerResp.status).toBe(200);

  const loginResp = await request(app)
    .put("/api/auth")
    .send({
      email: "logout@example.com",
      password: "password123",
    })
    .set("Authorization", registerResp.body.token);

  expect(loginResp.status).toBe(200);
  expect(loginResp.body).toHaveProperty("user");
  expect(loginResp.body).toHaveProperty("token");

  const logoutResp = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${loginResp.body.token}`);

  expect(logoutResp.status).toBe(200);
  expect(logoutResp.body).toEqual(
    expect.objectContaining({
      message: "logout successful",
    })
  );
});

test("Logout without token fails", async () => {
  const logoutResp = await request(app).delete("/api/auth");

  expect(logoutResp.status).toBe(401);
  expect(logoutResp.body).toEqual(
    expect.objectContaining({
      message: "unauthorized",
    })
  );
});

test("Logout with invalid token fails", async () => {
  const logoutResp = await request(app)
    .delete("/api/auth")
    .set("Authorization", "Bearer invalidtoken");

  expect(logoutResp.status).toBe(401);
  expect(logoutResp.body).toEqual(
    expect.objectContaining({
      message: "unauthorized",
    })
  );
});
