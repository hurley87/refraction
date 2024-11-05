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
      from: "Support <support@irl.energy>",
      to: [emailAddress],
      subject: "$IRL",
      text,
      react: EmailTemplate({}),
    });

    resend.contacts.create({
      email: emailAddress,
      audienceId: "11cbf1ba-8c50-4e6d-8735-51488886bae8",
    });

    if (error) {
      console.log("error", error);
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
