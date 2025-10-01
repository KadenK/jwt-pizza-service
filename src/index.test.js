const mockListen = jest.fn((port, callback) => {
  callback();
});

jest.mock("./service.js", () => ({
  listen: mockListen,
}));

test("Server is started on specified port", () => {
  process.argv = ["node", "index.js"];

  require("./index.js");

  expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
});
