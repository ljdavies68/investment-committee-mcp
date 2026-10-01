import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const INVESTMENT_API =
  "https://investment-api.ljdavies68.workers.dev";

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

  return response.json();
}

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

function createServer() {
  const server = new McpServer({
    name: "investment-committee",
    version: "1.0.0",
  });

  server.registerTool(
    "getCommittee",
    {
      title: "Get Investment Committee Portfolio Data",
      description:
        "Get the current live portfolio summary and holdings. Use this first whenever the user asks about their portfolio, current holdings, allocation, performance, investment decisions, or current investments.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await callInvestmentApi("/committee");
      return result(data);
    }
  );

  server.registerTool(
    "getHoldings",
    {
      title: "Get Current Holdings",
      description:
        "Get the user's current live investment holdings with friendly ticker and company names.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await callInvestmentApi("/holdings");
      return result(data);
    }
  );

  server.registerTool(
    "getPortfolio",
    {
      title: "Get Raw Portfolio",
      description:
        "Get the raw current Trading 212 portfolio data. Use when detailed raw position information is required.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await callInvestmentApi("/portfolio");
      return result(data);
    }
  );

  server.registerTool(
    "getHealth",
    {
      title: "Check Investment API",
      description:
        "Check whether the underlying Investment API and Trading 212 credentials are configured.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await callInvestmentApi("/health");
      return result(data);
    }
  );

  return server;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

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

    if (url.pathname === "/mcp") {
      const server = createServer();

      return createMcpHandler(server, {
        route: "/mcp",
      })(request);
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
};
