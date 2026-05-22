// Vitest global setup. Mocks server-only deps and provides typed prisma mock.
import { vi, beforeEach } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"
import type { PrismaClient } from "@prisma/client"

// "server-only" pragma blocks tests because vitest runs them in Node.
// Stub it so importing modules that say `import "server-only"` doesn't error.
vi.mock("server-only", () => ({}))

// Provide a typed deep mock of Prisma Client.
// Every test that needs prisma will import this and arrange the responses.
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>()

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

// Reset between tests so arrange state doesn't bleed.
beforeEach(() => {
  mockReset(prismaMock)
})
