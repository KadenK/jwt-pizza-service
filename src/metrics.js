const config = require("./config");

let totalRequests = 0;
const requestCounts = {
  get: 0,
  post: 0,
  put: 0,
  delete: 0,
};

let authSuccessCount = 0;
let authFailureCount = 0;
let activeTokens = new Map();

async function requestTracker(req, res, next) {
  const method = req.method.toLowerCase();
  const originalPath = req.path;
  if (requestCounts[method] !== undefined) {
    totalRequests++;
    requestCounts[method]++;
  }

  // Trigger on response finish to track auth metrics
  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (originalPath === "/api/auth" && requestCounts[method] !== undefined) {
      if (method === "post" || method === "put") {
        if (statusCode >= 200 && statusCode < 300) {
          authSuccessCount++;
        } else {
          authFailureCount++;
        }
      }
    }
  });

  next();
}

async function pizzaPurchase(status, latency, count, price) {}

async function sendAllMetrics() {
  // Clean up expired tokens
  const now = Date.now();
  for (const [token, exp] of activeTokens) {
    if (exp < now) {
      activeTokens.delete(token);
    }
  }

  const metrics = [];

  // Build system metrics
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();
  metrics.push(buildMetric("cpu_usage", cpuUsage, "gauge", "%"));
  metrics.push(buildMetric("memory_usage", memoryUsage, "gauge", "%"));

  // Build request metrics
  metrics.push(buildMetric("requests_total", totalRequests, "sum", "1"));
  Object.keys(requestCounts).forEach((key) => {
    metrics.push(
      buildMetric(`requests_${key}`, requestCounts[key], "sum", "1")
    );
  });

  // Build auth metrics
  metrics.push(buildMetric("auth_success_count", authSuccessCount, "sum", "1"));
  metrics.push(buildMetric("auth_failure_count", authFailureCount, "sum", "1"));
  metrics.push(
    buildMetric("active_tokens_count", activeTokens.size, "gauge", "1")
  );

  // Send all metrics to Grafana
  sendMetricsToGrafana(metrics);
}

setInterval(() => {
  sendAllMetrics();
}, 1000);

function buildMetric(metricName, metricValue, type, unit) {
  const metric = {
    name: metricName,
    unit: unit,
    [type]: {
      dataPoints: [
        {
          [type === "gauge" ? "asDouble" : "asInt"]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [
            {
              key: "source",
              value: { stringValue: config.metrics.source },
            },
          ],
        },
      ],
    },
  };

  if (type === "sum") {
    metric[type].aggregationTemporality = "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric[type].isMonotonic = true;
  }

  return metric;
}

function sendMetricsToGrafana(metrics) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(metric);
  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: body,
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(
            `Failed to push metrics data to Grafana: ${text}\n${body}`
          );
        });
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage;
}

function addActiveToken(token) {
  activeTokens.set(token, Date.now() + 2 * 60 * 60 * 1000);
}

function removeActiveToken(token) {
  activeTokens.delete(token);
}

module.exports = {
  requestTracker,
  pizzaPurchase,
  addActiveToken,
  removeActiveToken,
};
