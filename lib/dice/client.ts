import {
  diceGraphQLResponseSchema,
  diceEventsGraphQLResponseSchema,
  type DiceEvent,
} from "./schemas";

const GET_EVENTS_QUERY = `
query GetEvents($first: Int, $after: String) {
  viewer {
    events(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          startDatetime
          endDatetime
          description
          state
          venues {
            name
            city
            country
            latitude
            longitude
          }
          images {
            url
            type
          }
          ticketTypes {
            id
            name
            price
          }
        }
      }
    }
  }
}
`;

const GET_EVENT_QUERY = `
query GetEvent($eventId: ID!) {
  node(id: $eventId) {
    ... on Event {
      id
      name
      startDatetime
      endDatetime
      description
      state
      venues {
        name
        city
        country
        latitude
        longitude
      }
      images {
        url
        type
      }
      ticketTypes {
        id
        name
        price
      }
    }
  }
}
`;

export class DiceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "DiceApiError";
  }
}

function getDiceConfig() {
  const apiKey = process.env.DICE_API_KEY;
  const apiUrl =
    process.env.DICE_API_URL ||
    "https://partners-endpoint.dice.fm/graphql";

  if (!apiKey) {
    throw new DiceApiError("DICE_API_KEY environment variable is not set", 500);
  }

  return { apiKey, apiUrl };
}

/**
 * Fetch an event from the DICE API by ID
 * @param eventId - The base64-encoded event ID (e.g., "RXZlbnQ6NjA0ODM=")
 * @returns The event data
 * @throws DiceApiError on failure
 */
export async function fetchEvent(eventId: string): Promise<DiceEvent> {
  const { apiKey, apiUrl } = getDiceConfig();

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: GET_EVENT_QUERY,
        variables: { eventId },
      }),
    });
  } catch (error) {
    throw new DiceApiError(
      "Network error while connecting to DICE API",
      500,
      error,
    );
  }

  if (response.status === 401) {
    throw new DiceApiError("DICE authentication failed", 401);
  }

  if (response.status === 429) {
    throw new DiceApiError("Rate limited, try again later", 429);
  }

  if (!response.ok) {
    throw new DiceApiError(
      `DICE API returned status ${response.status}`,
      response.status,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new DiceApiError("Failed to parse DICE API response", 500, error);
  }

  const parsed = diceGraphQLResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new DiceApiError(
      "Invalid response format from DICE API",
      500,
      parsed.error,
    );
  }

  const { data, errors } = parsed.data;

  if (errors && errors.length > 0) {
    const errorMessage = errors.map((e) => e.message).join("; ");
    throw new DiceApiError(`DICE API error: ${errorMessage}`, 500);
  }

  if (!data?.node) {
    throw new DiceApiError("Event not found", 404);
  }

  return data.node;
}

export interface FetchEventsOptions {
  first?: number;
  after?: string;
}

export interface FetchEventsResult {
  events: DiceEvent[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

/**
 * Fetch all events for the authenticated partner
 * @param options - Pagination options (first, after cursor)
 * @returns List of events with pagination info
 * @throws DiceApiError on failure
 */
export async function fetchEvents(
  options: FetchEventsOptions = {},
): Promise<FetchEventsResult> {
  const { apiKey, apiUrl } = getDiceConfig();
  const { first = 20, after } = options;

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: GET_EVENTS_QUERY,
        variables: { first, after },
      }),
    });
  } catch (error) {
    throw new DiceApiError(
      "Network error while connecting to DICE API",
      500,
      error,
    );
  }

  if (response.status === 401) {
    throw new DiceApiError("DICE authentication failed", 401);
  }

  if (response.status === 429) {
    throw new DiceApiError("Rate limited, try again later", 429);
  }

  if (!response.ok) {
    throw new DiceApiError(
      `DICE API returned status ${response.status}`,
      response.status,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new DiceApiError("Failed to parse DICE API response", 500, error);
  }

  const parsed = diceEventsGraphQLResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new DiceApiError(
      "Invalid response format from DICE API",
      500,
      parsed.error,
    );
  }

  const { data, errors } = parsed.data;

  if (errors && errors.length > 0) {
    const errorMessage = errors.map((e) => e.message).join("; ");
    throw new DiceApiError(`DICE API error: ${errorMessage}`, 500);
  }

  if (!data?.viewer?.events) {
    return { events: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const events = data.viewer.events.edges.map((edge) => edge.node);
  const pageInfo = data.viewer.events.pageInfo;

  return { events, pageInfo };
}
