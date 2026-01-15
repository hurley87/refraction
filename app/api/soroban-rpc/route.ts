import { NextRequest, NextResponse } from "next/server";
import { getStellarNetworkConfig } from "@/lib/stellar/utils/network";

/**
 * Proxy API route for Soroban RPC requests
 * This bypasses CORS issues by making requests server-side
 */
export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[Soroban RPC Proxy] Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error: Invalid JSON in request body",
          },
          id: null,
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }
    
    // Get the RPC URL from network configuration
    const { rpcUrl } = getStellarNetworkConfig();
    
    console.log("[Soroban RPC Proxy] Forwarding request to:", rpcUrl);
    console.log("[Soroban RPC Proxy] Request body:", JSON.stringify(body, null, 2));
    
    // Forward the JSON-RPC request to the Soroban RPC endpoint
    let response: Response;
    try {
      response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError) {
      console.error("[Soroban RPC Proxy] Fetch error:", fetchError);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Failed to connect to RPC server: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          },
          id: body.id || null,
        },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    if (!response.ok) {
      let errorText: string;
      try {
        errorText = await response.text();
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      console.error("[Soroban RPC Proxy] RPC error response:", response.status, errorText);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `RPC server returned ${response.status}: ${errorText}`,
          },
          id: body.id || null,
        },
        {
          status: response.status,
          headers: corsHeaders,
        }
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("[Soroban RPC Proxy] Failed to parse RPC response:", parseError);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Failed to parse RPC server response",
          },
          id: body.id || null,
        },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }
    
    console.log("[Soroban RPC Proxy] Success response");
    
    // Return the response with appropriate status
    return NextResponse.json(data, { 
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[Soroban RPC Proxy] Unexpected exception:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Proxy error: ${errorMessage}`,
        },
        id: null,
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
