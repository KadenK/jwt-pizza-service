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

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users forbidden", async () => {
  const [user, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(403);
});

test("list users", async () => {
  const [user, userToken] = await loginAdmin(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body).toHaveProperty("users");
  expect(listUsersRes.body).toHaveProperty("more");
  expect(Array.isArray(listUsersRes.body.users)).toBe(true);
  expect(listUsersRes.body.users.length).toBeGreaterThan(0);
  expect(listUsersRes.body.users[0]).toHaveProperty("id");
  expect(listUsersRes.body.users[0]).toHaveProperty("name");
  expect(listUsersRes.body.users[0]).toHaveProperty("email");
  expect(listUsersRes.body.users[0]).toHaveProperty("roles");
});

test("delete user unauthorized", async () => {
  const deleteUserRes = await request(app).delete("/api/user/1");
  expect(deleteUserRes.status).toBe(401);
});

test("delete user forbidden", async () => {
  const [user, userToken] = await registerUser(request(app));
  const deleteUserRes = await request(app)
    .delete("/api/user/1")
    .set("Authorization", "Bearer " + userToken);
  expect(deleteUserRes.status).toBe(403);
});

test("delete user", async () => {
  const [adminUser, adminToken] = await loginAdmin(request(app));

  const [user, userToken] = await registerUser(request(app));

  const deleteOtherUserRes = await request(app)
    .delete(`/api/user/${user.id}`)
    .set("Authorization", "Bearer " + adminToken);

  expect(deleteOtherUserRes.status).toBe(200);
  expect(deleteOtherUserRes.body).toEqual(
    expect.objectContaining({
      message: "user deleted",
    })
  );
});

async function loginAdmin(service) {
  const adminUser = {
    email: "a@jwt.com",
    password: "admin",
  };
  const adminRes = await service.put("/api/auth").send(adminUser);
  return [adminRes.body.user, adminRes.body.token];
}

async function registerUser(service) {
  const testUser = {
    name: "pizza diner",
    email: `${randomName()}@test.com`,
    password: "a",
  };
  const registerRes = await service.post("/api/auth").send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
