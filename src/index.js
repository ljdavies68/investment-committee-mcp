import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";

const INVESTMENT_API =
  "https://investment-api.ljdavies68.workers.dev";

/*
 * Calls the existing Investment API.
 * Your Trading 212 credentials remain in the original
 * Cloudflare Worker and are NOT stored here.
 */
async function callInvestmentApi(path) {
  const response = await fetch(`${INVESTMENT_API}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Investment API returned ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

/*
 * Converts API responses into a format MCP can return to ChatGPT.
 */
function result(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  };
}

/*
 * Creates the Investment Committee MCP server.
 */
function createServer() {
  const server = new McpServer({
    name: "investment-committee",
    version: "1.0.0",
  });

  /*
   * Main portfolio tool.
   *
   * ChatGPT should use this first for questions about the
   * user's current portfolio or investment decisions.
   */
  server.registerTool(
    "getCommittee",
    {
      title: "Get Investment Committee Portfolio Data",
      description:
        "Get the user's current live portfolio summary and holdings. Use this first whenever the user asks about their portfolio, current holdings, allocation, performance, investment decisions, or current investments.",
      inputSchema: {},
    },
    async () => {
      const data = await callInvestmentApi("/committee");
      return result(data);
    }
  );

  /*
   * Friendly holdings list.
   */
  server.registerTool(
    "getHoldings",
    {
      title: "Get Current Holdings",
      description:
        "Get the user's current live investment holdings, including friendly ticker and company names.",
      inputSchema: {},
    },
    async () => {
      const data = await callInvestmentApi("/holdings");
      return result(data);
    }
  );

  /*
   * Raw Trading 212 portfolio information.
   */
  server.registerTool(
    "getPortfolio",
    {
      title: "Get Raw Portfolio",
      description:
        "Get the user's raw current Trading 212 portfolio data. Use this when detailed raw position information is required.",
      inputSchema: {},
    },
    async () => {
      const data = await callInvestmentApi("/portfolio");
      return result(data);
    }
  );

  /*
   * Health check.
   */
  server.registerTool(
    "getHealth",
    {
      title: "Check Investment API",
      description:
        "Check whether the underlying Investment API and Trading 212 credentials are configured and available.",
      inputSchema: {},
    },
    async () => {
      const data = await callInvestmentApi("/health");
      return result(data);
    }
  );

  return server;
}

/*
 * Cloudflare Worker entry point.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    /*
     * Simple browser-readable home page/API check.
     */
    if (url.pathname === "/") {
      return Response.json({
        name: "Investment Committee MCP",
        status: "running",
        mcp: "/mcp",
        tools: [
          "getCommittee",
          "getHoldings",
          "getPortfolio",
          "getHealth",
        ],
      });
    }

    /*
     * MCP endpoint used by ChatGPT.
     */
    if (url.pathname === "/mcp") {
      return createMcpHandler(createServer, {
        route: "/mcp",
      })(request);
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
};
