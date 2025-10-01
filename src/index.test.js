// Mock must be at the top, before any requires
const mockListen = jest.fn((port, callback) => {
  callback();
});

jest.mock("./service.js", () => ({
  listen: mockListen,
}));

test("Server is started on specified port", () => {
  // Clear argv to ensure default port behavior
  const originalArgv = process.argv;
  process.argv = ["node", "index.js"];

  require("./index.js");

  // Restore original argv
  process.argv = originalArgv;

  expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
});
