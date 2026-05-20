export const typeDefs = `#graphql
  type Query {
    samples(page: Int, pageSize: Int): SamplePage!
    sample(id: ID!): Sample
    sops(page: Int, pageSize: Int): SOPPage!
    sop(id: ID!): SOP
    grants(page: Int, pageSize: Int): GrantPage!
    grant(id: ID!): Grant
    participants(studyId: ID, page: Int, pageSize: Int): ParticipantPage!
    participant(id: ID!): Participant
    studies(page: Int, pageSize: Int): StudyPage!
  }

  type Mutation {
    createSample(input: CreateSampleInput!): Sample!
    updateSample(id: ID!, input: UpdateSampleInput!): Sample!
  }

  # ─── Sample ───────────────────────────────────────────────────────────────

  type Sample {
    id: ID!
    accessionId: String!
    participantId: String!
    collectedAt: String!
    status: String!
    studyCode: String
    notes: String
    createdAt: String!
  }

  type SamplePage {
    data: [Sample!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  input CreateSampleInput {
    accessionId: String!
    participantId: ID!
    collectedAt: String!
    status: String
    studyCode: String
    notes: String
  }

  input UpdateSampleInput {
    status: String
    notes: String
    storageLocationId: ID
  }

  # ─── SOP ──────────────────────────────────────────────────────────────────

  type SOP {
    id: ID!
    code: String!
    title: String!
    version: String!
    status: String!
    ownerId: String!
    createdAt: String!
  }

  type SOPPage {
    data: [SOP!]!
    total: Int!
    page: Int!
  }

  # ─── Grant ────────────────────────────────────────────────────────────────

  type Grant {
    id: ID!
    code: String!
    title: String!
    funder: String!
    awardedAmount: Float!
    currency: String!
    startDate: String!
    endDate: String!
    status: String!
    createdAt: String!
  }

  type GrantPage {
    data: [Grant!]!
    total: Int!
    page: Int!
  }

  # ─── Participant ──────────────────────────────────────────────────────────

  type Participant {
    id: ID!
    pseudonymId: String!
    studyId: String!
    status: String!
    enrolledAt: String
    createdAt: String!
  }

  type ParticipantPage {
    data: [Participant!]!
    total: Int!
    page: Int!
  }

  # ─── Study ────────────────────────────────────────────────────────────────

  type Study {
    id: ID!
    code: String!
    title: String!
    status: String!
    pi: String
    startDate: String
    endDate: String
  }

  type StudyPage {
    data: [Study!]!
    total: Int!
    page: Int!
  }
`;
