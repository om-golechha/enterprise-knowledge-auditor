import subprocess
import json
import time
import sys

def test_mcp():
    # Start the MCP server process
    process = subprocess.Popen(
        [sys.executable, "-m", "app.mcp_server"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Prepare an initialize request matching MCP protocol
    init_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }

    try:
        # Send init
        process.stdin.write(json.dumps(init_req) + "\n")
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if not response_line:
            print("FAILED: No output from MCP server")
            err = process.stderr.read()
            print("STDERR:", err)
            return

        resp = json.loads(response_line)
        print("Received Initialization Response:", json.dumps(resp, indent=2))
        
        if resp.get("id") == 1 and "result" in resp:
            print("\n✅ MCP Server initialized successfully!")
            
            # Send initialized notification
            initialized_notif = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }
            process.stdin.write(json.dumps(initialized_notif) + "\n")
            process.stdin.flush()
            
            # Now let's ask for tools
            tools_req = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list"
            }
            process.stdin.write(json.dumps(tools_req) + "\n")
            process.stdin.flush()
            
            tools_resp = json.loads(process.stdout.readline())
            print("\nReceived Tools Response:", json.dumps(tools_resp, indent=2))
            
            if tools_resp.get("id") == 2 and "result" in tools_resp:
                tools = tools_resp["result"].get("tools", [])
                print(f"\n✅ Found {len(tools)} tools: {[t['name'] for t in tools]}")
            else:
                print("FAILED: Did not get valid tools response")
        else:
            print("FAILED: Invalid init response")
            
    finally:
        process.terminate()

if __name__ == "__main__":
    test_mcp()
