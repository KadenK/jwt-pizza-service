const request = require("supertest");
const app = require("../service");

let adminAuthToken;
let adminUserId;

let userAuthToken;
let userUserId;

beforeAll(async () => {
  const loginAdminUserResp = await request(app).put("/api/auth").send({
    email: "a@jwt.com",
    password: "admin",
  });

  adminAuthToken = loginAdminUserResp.body.token;
  adminUserId = loginAdminUserResp.body.user.id;

  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    email: "test@jwt.com",
    password: "user",
  });

  userAuthToken = registerUserResp.body.token;
  userUserId = registerUserResp.body.user.id;
});

test("Lists franchises when no franchises exist", async () => {
  const response = await request(app)
    .get("/api/franchise")
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(false);
});

test("Create a new franchise", async () => {
  const randomName = `Franchise ${Math.floor(Math.random() * 1000000)}`;
  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomName,
      admins: [{ email: "test@example.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomName);
});

test("Error when creating franchise as user", async () => {
  const randomName = `Franchise ${Math.floor(Math.random() * 1000000)}`;
  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomName,
      admins: [{ email: "test@example.com" }],
    })
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(createFranchiseResp.status).toBe(403);
  expect(createFranchiseResp.body.message).toBe("unable to create a franchise");
});

test("Get user franchises", async () => {
  const response = await request(app)
    .get(`/api/franchise/${userUserId}`)
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test("Get user franchises as admin", async () => {
  const response = await request(app)
    .get(`/api/franchise/${userUserId}`)
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test("Error when getting another user's franchises", async () => {
  const response = await request(app)
    .get(`/api/franchise/${adminUserId}`)
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBe(0);
});

test("Create store for franchise", async () => {
  // Create franchise
  const randomFranchiseName = `Franchise ${Math.floor(
    Math.random() * 1000000
  )}`;

  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomFranchiseName,
      admins: [{ email: "test@example.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomFranchiseName);

  // Create store on franchise
  const randomStoreName = `Store ${Math.floor(Math.random() * 1000000)}`;

  const createStoreResp = await request(app)
    .post(`/api/franchise/${createFranchiseResp.body.id}/store`)
    .send({
      name: randomStoreName,
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createStoreResp.status).toBe(200);
  expect(createStoreResp.body).toHaveProperty("id");
  expect(createStoreResp.body).toHaveProperty("name", randomStoreName);
});

test("Error when creating store as unauthorized user", async () => {
  // Create franchise
  const randomFranchiseName = `Franchise ${Math.floor(
    Math.random() * 1000000
  )}`;

  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomFranchiseName,
      admins: [{ email: "a@jwt.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomFranchiseName);

  const randomStoreName = `Store ${Math.floor(Math.random() * 1000000)}`;

  const createStoreResp = await request(app)
    .post(`/api/franchise/${createFranchiseResp.body.id}/store`)
    .send({
      name: randomStoreName,
    })
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(createStoreResp.status).toBe(403);
  expect(createStoreResp.body.message).toBe("unable to create a store");
});

test("Delete a franchise", async () => {
  // Create franchise
  const randomFranchiseName = `Franchise ${Math.floor(
    Math.random() * 1000000
  )}`;

  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomFranchiseName,
      admins: [{ email: "a@jwt.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomFranchiseName);

  const deleteFranchiseResp = await request(app)
    .delete(`/api/franchise/${createFranchiseResp.body.id}`)
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(deleteFranchiseResp.status).toBe(200);
  expect(deleteFranchiseResp.body.message).toBe("franchise deleted");
});

test("Delete store from a franchise", async () => {
  // Create franchise
  const randomFranchiseName = `Franchise ${Math.floor(
    Math.random() * 1000000
  )}`;

  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomFranchiseName,
      admins: [{ email: "a@jwt.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomFranchiseName);

  // Create store on franchise
  const randomStoreName = `Store ${Math.floor(Math.random() * 1000000)}`;

  const createStoreResp = await request(app)
    .post(`/api/franchise/${createFranchiseResp.body.id}/store`)
    .send({
      name: randomStoreName,
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createStoreResp.status).toBe(200);
  expect(createStoreResp.body).toHaveProperty("id");
  expect(createStoreResp.body).toHaveProperty("name", randomStoreName);

  // Delete store from franchise
  const deleteStoreResp = await request(app)
    .delete(
      `/api/franchise/${createFranchiseResp.body.id}/store/${createStoreResp.body.id}`
    )
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(deleteStoreResp.status).toBe(200);
  expect(deleteStoreResp.body.message).toBe("store deleted");
});

test("Error when deleting a store from a franchise as non-admin", async () => {
  // Create franchise
  const randomFranchiseName = `Franchise ${Math.floor(
    Math.random() * 1000000
  )}`;

  const createFranchiseResp = await request(app)
    .post("/api/franchise")
    .send({
      name: randomFranchiseName,
      admins: [{ email: "a@jwt.com" }],
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createFranchiseResp.status).toBe(200);
  expect(createFranchiseResp.body).toHaveProperty("id");
  expect(createFranchiseResp.body).toHaveProperty("name", randomFranchiseName);

  // Create store on franchise
  const randomStoreName = `Store ${Math.floor(Math.random() * 1000000)}`;

  const createStoreResp = await request(app)
    .post(`/api/franchise/${createFranchiseResp.body.id}/store`)
    .send({
      name: randomStoreName,
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createStoreResp.status).toBe(200);
  expect(createStoreResp.body).toHaveProperty("id");
  expect(createStoreResp.body).toHaveProperty("name", randomStoreName);

  // Delete store from franchise
  const deleteStoreResp = await request(app)
    .delete(
      `/api/franchise/${createFranchiseResp.body.id}/store/${createStoreResp.body.id}`
    )
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(deleteStoreResp.status).toBe(403);
  expect(deleteStoreResp.body.message).toBe("unable to delete a store");
});
