import { z } from 'zod';

/**
 * Schema for DICE venue data
 */
export const diceVenueSchema = z.object({
  name: z.string(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

/**
 * Schema for DICE event image
 */
export const diceImageSchema = z.object({
  url: z.string(),
  type: z.string().nullable().optional(),
});

/**
 * Schema for DICE ticket type
 */
export const diceTicketTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
});

/**
 * Schema for GraphQL error
 */
export const graphQLErrorSchema = z.object({
  message: z.string(),
  locations: z
    .array(
      z.object({
        line: z.number(),
        column: z.number(),
      })
    )
    .optional(),
  path: z.array(z.string()).optional(),
  extensions: z.record(z.unknown()).optional(),
});

/**
 * Schema for DICE ticket holder (fan who owns a ticket)
 */
export const diceTicketHolderSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

/**
 * Schema for DICE ticket (includes holder)
 */
export const diceTicketSchema = z.object({
  id: z.string(),
  ticketType: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  holder: diceTicketHolderSchema.nullable().optional(),
  claimedAt: z.string().nullable().optional(),
});

/**
 * Schema for ticket edge in tickets connection
 */
export const diceTicketEdgeSchema = z.object({
  node: diceTicketSchema,
});

/**
 * Schema for pagination info (tickets)
 */
const ticketsPageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});

/**
 * Schema for tickets connection on an event
 */
export const diceTicketsConnectionSchema = z.object({
  pageInfo: ticketsPageInfoSchema,
  edges: z.array(diceTicketEdgeSchema),
});

/**
 * Schema for DICE event data
 */
export const diceEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDatetime: z.string().nullable().optional(),
  endDatetime: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  venues: z.array(diceVenueSchema).nullable().optional(),
  images: z.array(diceImageSchema).nullable().optional(),
  ticketTypes: z.array(diceTicketTypeSchema).nullable().optional(),
});

/**
 * Schema for event node with tickets (for GetEventTickets query)
 */
export const diceEventWithTicketsSchema = diceEventSchema.extend({
  tickets: diceTicketsConnectionSchema.nullable().optional(),
});

/**
 * Schema for DICE GraphQL response (event with tickets)
 */
export const diceEventTicketsResponseSchema = z.object({
  data: z
    .object({
      node: diceEventWithTicketsSchema.nullable(),
    })
    .nullable()
    .optional(),
  errors: z.array(graphQLErrorSchema).optional(),
});

/**
 * Schema for DICE GraphQL response wrapper (single event)
 */
export const diceGraphQLResponseSchema = z.object({
  data: z
    .object({
      node: diceEventSchema.nullable(),
    })
    .nullable()
    .optional(),
  errors: z.array(graphQLErrorSchema).optional(),
});

/**
 * Schema for pagination info
 */
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});

/**
 * Schema for event edge in connection
 */
export const diceEventEdgeSchema = z.object({
  node: diceEventSchema,
});

/**
 * Schema for events connection
 */
export const diceEventsConnectionSchema = z.object({
  pageInfo: pageInfoSchema,
  edges: z.array(diceEventEdgeSchema),
});

/**
 * Schema for DICE GraphQL response wrapper (events list)
 */
export const diceEventsGraphQLResponseSchema = z.object({
  data: z
    .object({
      viewer: z
        .object({
          events: diceEventsConnectionSchema,
        })
        .nullable(),
    })
    .nullable()
    .optional(),
  errors: z.array(graphQLErrorSchema).optional(),
});

export type DiceVenue = z.infer<typeof diceVenueSchema>;
export type DiceImage = z.infer<typeof diceImageSchema>;
export type DiceTicketType = z.infer<typeof diceTicketTypeSchema>;
export type DiceTicketHolder = z.infer<typeof diceTicketHolderSchema>;
export type DiceTicket = z.infer<typeof diceTicketSchema>;
export type DiceEvent = z.infer<typeof diceEventSchema>;
export type DiceEventWithTickets = z.infer<typeof diceEventWithTicketsSchema>;
export type DiceGraphQLResponse = z.infer<typeof diceGraphQLResponseSchema>;
export type DiceEventTicketsResponse = z.infer<
  typeof diceEventTicketsResponseSchema
>;
