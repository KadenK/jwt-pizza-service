const request = require("supertest");
const app = require("../service");

let authToken;
let userId;

beforeAll(async () => {
  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });

  authToken = registerUserResp.body.token;
  userId = registerUserResp.body.user.id;
});

test("Get authenticated user", async () => {
  const response = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${authToken}`);

  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({
      id: userId,
      name: "Test User",
      email: "test@example.com",
    })
  );
});

test("Update user", async () => {
  const response = await request(app)
    .put(`/api/user/${userId}`)
    .send({
      name: "Updated User",
      email: "updated@example.com",
    })
    .set("Authorization", `Bearer ${authToken}`);

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("user");
  expect(response.body.user).toEqual(
    expect.objectContaining({
      name: "Updated User",
      email: "updated@example.com",
    })
  );
});

test("Error when updating another user without admin role", async () => {
  const response = await request(app)
    .put(`/api/user/${userId + 1}`) // Attempt to update a different user
    .send({
      name: "Hacker User",
      email: "hacker@example.com",
    })
    .set("Authorization", `Bearer ${authToken}`);

  expect(response.status).toBe(403);
  expect(response.body).toEqual(
    expect.objectContaining({
      message: "unauthorized",
    })
  );
});
