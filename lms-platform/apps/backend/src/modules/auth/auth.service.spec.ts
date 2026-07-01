import { AuthService } from "./auth.service";

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue("hashed"),
}));

describe("AuthService — refresh token uniqueness", () => {
  function buildService() {
    const user = {
      id: "user-1",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
      email_verified: true,
      password_hash: "hashed",
      profile: {},
      affiliate_profile: null,
    };

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        // A real DB would reject a second insert with the same token_hash —
        // simulate that by throwing if create() is ever called twice with an
        // identical token_hash, the exact race this test guards against.
        create: (() => {
          const seenHashes = new Set<string>();
          return jest.fn().mockImplementation(({ data }: any) => {
            if (seenHashes.has(data.token_hash)) {
              throw new Error("Unique constraint failed on the fields: (`token_hash`)");
            }
            seenHashes.add(data.token_hash);
            return Promise.resolve({ id: `rt-${seenHashes.size}`, ...data });
          });
        })(),
      },
    } as any;

    // Deterministic on payload content only — mirrors a real JWT signed at the
    // same instant (same iat) for the same user: identical payload → identical
    // token. This means the ONLY thing that can make two concurrent refresh
    // tokens differ is the jti the fix adds — if that jti were ever removed,
    // this mock would produce identical tokens again and the test would catch
    // the token_hash collision via the throwing prisma mock above.
    const jwtService = {
      sign: jest.fn().mockImplementation((payload: any) => JSON.stringify(payload)),
    } as any;

    const config = { get: jest.fn().mockReturnValue("secret") } as any;
    const mail = {} as any;

    return new AuthService(prisma, jwtService, config, mail);
  }

  it("gives two same-instant logins distinct refresh tokens instead of colliding", async () => {
    const service = buildService();

    const [first, second] = await Promise.all([
      service.login({ email: "admin@example.com", password: "x" } as any),
      service.login({ email: "admin@example.com", password: "x" } as any),
    ]);

    expect(first.refresh_token).not.toEqual(second.refresh_token);
  });
});
