import * as React from "react";

interface EmailTemplateProps {}
const URL =
  "https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/";

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({}) => (
  <div>
    <p>
      Thank you for joining $IRL and congratulations on completing the Side
      Quest in Bangkok! We’re just getting started, and we can’t wait to see
      what’s next.
    </p>
    <p>
      Stay connected and keep an eye on <a href={URL}>TOWNS</a> for the latest
      on your future $IRL claim, new $IRL Side Quests, and more exclusive
      experiences.
    </p>
    <p>What is $IRL?</p>
    <p>
      $IRL is your gateway to unforgettable, in-person experiences powered by
      the digital culture you love. Dive into Bangkok’s launch to explore,
      connect, and collect.
    </p>
    <p>What are Side Quests?</p>
    <p>
      Think of them as mini-adventures! Complete each Side Quest to unlock
      rewards, explore the space, and get closer to our special $IRL claim.
    </p>
    <p>
      <a href={URL}>Join our community on TOWNS for updates!</a>
    </p>
    <p>
      <img
        src="https://www.irl.energy/irl.png"
        alt="symbols"
        height={300}
        width={300}
      />
    </p>
  </div>
);
