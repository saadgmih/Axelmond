import { prisma } from "../src/db";

async function main() {
  const count = await prisma.promoCode.count();
  const codes = await prisma.promoCode.findMany({
    select: {
      id: true,
      code: true,
      administrativeStatus: true,
      discountType: true,
      discountValue: true,
    },
  });
  console.log("PROMO_COUNT:", count);
  console.log("PROMO_LIST:", JSON.stringify(codes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
