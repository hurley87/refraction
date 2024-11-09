import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface EmailTemplateProps {}
const URL =
  "https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/";

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const button = {
  backgroundColor: "#000",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "10px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
};

const headerText = {
  fontSize: "24px",
  lineHeight: "32px",
};

const secondaryHeaderText = {
  fontSize: "18px",
  lineHeight: "24px",
};

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({}) => (
  <Html>
    <Head />
    <Preview>
      You&apos;re now ready to make live transactions with Stripe!
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Text style={headerText}>Welcome to $IRL</Text>
          <Hr style={hr} />
          <Text style={paragraph}>
            Congratulations on completing the $IRL Side Quests in Bangkok!
          </Text>
          <Text style={paragraph}>
            Join the Refraction TOWN for YOUR future $IRL claim, new $IRL Side
            Quests, and more exclusive experiences.
          </Text>
          <Button style={button} href={URL}>
            Join our Town
          </Button>
          <Hr style={hr} />
          <Text style={secondaryHeaderText}>What&apos;s next for $IRL?</Text>
          <Text style={paragraph}>
            $IRL is your gateway to unforgettable, in-person experiences powered
            by the digital culture you love.
          </Text>
          <Text style={paragraph}>
            It&apos;s a groundbreaking token that unites audiences, artists, and
            the broader industry to unlock experiences, rewards, and more at
            events worldwide.
          </Text>
          <Text style={paragraph}>
            Going beyond blockchain early adopters, $IRL invites everyone to
            join the next wave of digital culture.
          </Text>
          <Hr style={hr} />
          <Text style={secondaryHeaderText}>About Refraction</Text>
          <Text style={paragraph}>
            Refraction is a global community redefining arts and culture through
            technology.
          </Text>
          <Text style={paragraph}>
            With over 50 events and 100,000+ guests worldwide, we connect to
            culture seekers through live experiences at major festivals and
            events. Founded by leaders from VICE, NIKE, and Boiler Room,
            Refraction bridges art, music, and tech innovation.
          </Text>
          <Text style={paragraph}>
            Through $IRL, we&apos;re entering our next phase, empowering the
            cultural ecosystem and forging a bold, inclusive path for creative
            expression globally.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            <Link href="https://www.irl.energy">Learn more</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
