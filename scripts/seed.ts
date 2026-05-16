import { db } from "../src/db";
import { appUsers } from "../src/db/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function seed() {
  const email = "vishweshmash86@gmail.com";
  const password = "Iphone.@1386";
  const name = "Vish";

  console.log("Creating admin user...");
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(appUsers).values({
    id: `USR-${randomBytes(6).toString("hex").toUpperCase()}`,
    name,
    email,
    passwordHash,
    role: "admin",
  }).onConflictDoNothing();

  console.log(`✓ Done! Login with:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
