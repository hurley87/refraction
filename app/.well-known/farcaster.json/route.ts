export async function GET() {
  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjc5ODgsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg1MUQ0NDZFOTNhMTcxZGQxMkY4NGI3NWE4RDFCNjgyNTVGN2MxRjgyIn0",
      payload: "eyJkb21haW4iOiJ3d3cuaXJsLmVuZXJneSJ9",
      signature:
        "MHhjYzMxZDAyOWRlYTBmYTNlYmQ0NmEwZTA0ZmE2ZGY4OWMwODRlMjkwMzVhN2JhZGYzODY5ZDEwZGM1ODMxMTI1NDE5OTMxMzhlNDU5OTFlYmIyODY0ZDUxNmJiOTg3MDBiMGI3NDk1YmZiNDczMzdlYTAyZDNlNTFjODM5N2FkYzFi",
    },
    frame: {
      version: "1",
      name: "IRL",
      iconUrl: "https://irl.energy/logo.png",
      homeUrl: "https://irl.energy",
      imageUrl: "https://irl.energy/logo.png",
      buttonTitle: "Launch IRL",
      splashImageUrl: "https://irl.energy/logo.png",
      splashBackgroundColor: "#ffffff",
      webhookUrl: "https://irl.energy/api/webhook",
    },
  };

  return Response.json(config);
}
