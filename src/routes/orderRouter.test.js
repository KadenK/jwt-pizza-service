const request = require("supertest");
const app = require("../service");

let adminAuthToken;

let userAuthToken;
let userUserId;

let franchiseId;
let storeId;

beforeAll(async () => {
  const loginAdminUserResp = await request(app).put("/api/auth").send({
    email: "a@jwt.com",
    password: "admin",
  });

  adminAuthToken = loginAdminUserResp.body.token;

  const registerUserResp = await request(app).post("/api/auth").send({
    name: "Test User",
    email: "test@example.com",
    password: "user",
  });

  userAuthToken = registerUserResp.body.token;
  userUserId = registerUserResp.body.user.id;

  // create a franchise for the admin user
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
  franchiseId = createFranchiseResp.body.id;

  // create a store for the franchise
  const randomStoreName = `Store ${Math.floor(Math.random() * 1000000)}`;
  const createStoreResp = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .send({
      name: randomStoreName,
      address: "123 Test St",
      city: "Testville",
      state: "TS",
      zip: "12345",
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);
  storeId = createStoreResp.body.id;

  // add a menu item
  const randomTitle = `Menu Item ${Math.floor(Math.random() * 1000000)}`;
  await request(app)
    .put("/api/order/menu")
    .send({
      title: randomTitle,
      description: "A delicious test item",
      image: "http://example.com/image.png",
      price: 0.0001,
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);
});

test("Get menu", async () => {
  const response = await request(app)
    .get("/api/order/menu")
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
});

test("Add menu item", async () => {
  const randomTitle = `Menu Item ${Math.floor(Math.random() * 1000000)}`;
  const createMenuItemResp = await request(app)
    .put("/api/order/menu")
    .send({
      title: randomTitle,
      description: "A delicious test item",
      image: "http://example.com/image.png",
      price: 9,
    })
    .set("Authorization", `Bearer ${adminAuthToken}`);

  expect(createMenuItemResp.status).toBe(200);
  expect(Array.isArray(createMenuItemResp.body)).toBe(true);
  expect(createMenuItemResp.body.length).toBeGreaterThan(0);
  expect(createMenuItemResp.body[createMenuItemResp.body.length - 1]).toEqual(
    expect.objectContaining({
      title: randomTitle,
      description: "A delicious test item",
      image: "http://example.com/image.png",
      price: 9,
    })
  );
});

test("Error when adding menu item as user", async () => {
  const randomTitle = `Menu Item ${Math.floor(Math.random() * 1000000)}`;
  const createMenuItemResp = await request(app)
    .put("/api/order/menu")
    .send({
      title: randomTitle,
      description: "A delicious test item",
      image: "http://example.com/image.png",
      price: 9,
    })
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(createMenuItemResp.status).toBe(403);
  expect(createMenuItemResp.body).toEqual(
    expect.objectContaining({
      message: "unable to add menu item",
    })
  );
});

test("Get orders", async () => {
  const response = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({
      dinerId: userUserId,
      orders: expect.any(Array),
    })
  );
});

test("Create order", async () => {
  expect(franchiseId).toBeDefined();
  expect(storeId).toBeDefined();
  // Get first menu item
  const menuItemsResp = await request(app)
    .get("/api/order/menu")
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(menuItemsResp.status).toBe(200);
  expect(Array.isArray(menuItemsResp.body)).toBe(true);
  expect(menuItemsResp.body.length).toBeGreaterThan(0);

  const firstMenuItem = menuItemsResp.body[0];

  const createOrderResp = await request(app)
    .post("/api/order")
    .send({
      franchiseId: franchiseId,
      storeId: storeId,
      items: [
        {
          menuId: firstMenuItem.id,
          description: firstMenuItem.description,
          price: firstMenuItem.price,
        },
      ],
    })
    .set("Authorization", `Bearer ${userAuthToken}`);

  expect(createOrderResp.status).toBe(200);
  expect(createOrderResp.body).toHaveProperty("order");
  expect(createOrderResp.body).toHaveProperty("jwt");
  expect(createOrderResp.body.order).toEqual(
    expect.objectContaining({
      franchiseId: franchiseId,
      storeId: storeId,
      items: expect.any(Array),
      id: expect.any(Number),
    })
  );
  expect(createOrderResp.body.order.items.length).toBe(1);
  expect(createOrderResp.body.order.items[0]).toEqual(
    expect.objectContaining({
      menuId: firstMenuItem.id,
      description: firstMenuItem.description,
      price: firstMenuItem.price,
    })
  );
  expect(createOrderResp.body.jwt).toEqual(expect.any(String));
  expect(createOrderResp.body.jwt.length).toBeGreaterThan(0);
});
