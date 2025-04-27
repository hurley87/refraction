export async function GET() {
  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjc5ODgsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg1MUQ0NDZFOTNhMTcxZGQxMkY4NGI3NWE4RDFCNjgyNTVGN2MxRjgyIn0",
      payload: "eyJkb21haW4iOiJpcmwuZW5lcmd5In0",
      signature:
        "MHgxODE1MTk1NDNmMmQwNGE3ZTM4NGJiMWVkNGNlNTNiZGU3YjQ2NDk1ODc0NzQxZjNlM2M5MjA1NDk2MWY5MTMxMGIwYmM4ZDQ3NWRiYzU5MzU1YzZjMDlhYmMwNzRiOGE0ODZhODIwNzg1MmE4MDg0NjJjNmNkYTM5NWI5YzM0ODFi",
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
