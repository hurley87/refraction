import { Resend } from "resend";
import { EmailTemplate } from "@/components/email-template";
import { NextRequest } from "next/server";
import { text } from "./text";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  const emailAddress = email.address;

  if (!emailAddress) {
    return Response.json(
      { error: "Email address is required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Support <david@irl.energy>",
      to: [emailAddress],
      subject: "$IRL",
      text,
      bcc: ["dhurls99@gmail.com"],
      react: EmailTemplate({}),
    });

    console.log("data", data);
    console.log("error", error);

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.log(error);
    return Response.json({ error }, { status: 500 });
  }
}
