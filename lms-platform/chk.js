const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO lms.affiliate_leads (id, affiliate_id, email, name, status, created_at, updated_at)
    SELECT gen_random_uuid(), 'd4fa9aea-e6f9-4128-a6ad-d4a53d805749', 'madaa.org@gmail.com',
      COALESCE((SELECT first_name || ' ' || last_name FROM lms.profiles WHERE user_id = '2c6f986f-9e98-487b-93c2-6d159d2a8eba'), NULL),
      'logged_in'::"lms"."AffiliateLeadStatus", NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM lms.affiliate_leads
      WHERE affiliate_id = 'd4fa9aea-e6f9-4128-a6ad-d4a53d805749' AND email = 'madaa.org@gmail.com'
    )
  `);
  const leads = await prisma.$queryRawUnsafe(
    `SELECT email, name, status, created_at FROM lms.affiliate_leads WHERE affiliate_id = 'd4fa9aea-e6f9-4128-a6ad-d4a53d805749' ORDER BY created_at DESC`
  );
  console.log("Leads now:", JSON.stringify(leads, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });