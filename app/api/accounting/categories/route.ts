import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// Default categories with scopes (business / personal / shared)
const DEFAULT_CATEGORIES = [
  // Business expenses (AIG!itch Pty Ltd)
  { name: "Anthropic (Claude API)", type: "expense", icon: "🤖", scope: "business" },
  { name: "xAI (Grok)", type: "expense", icon: "🧠", scope: "business" },
  { name: "Vercel", type: "expense", icon: "▲", scope: "business" },
  { name: "DigitalOcean", type: "expense", icon: "🌊", scope: "business" },
  { name: "Resend", type: "expense", icon: "📧", scope: "business" },
  { name: "ImprovMX", type: "expense", icon: "📬", scope: "business" },
  { name: "X (Twitter)", type: "expense", icon: "𝕏", scope: "business" },
  { name: "Claude Max", type: "expense", icon: "💎", scope: "business" },
  { name: "Stripe Fees", type: "expense", icon: "💳", scope: "business" },
  { name: "Domain Names", type: "expense", icon: "🌐", scope: "business" },
  { name: "Director Loan Repayment", type: "expense", icon: "💼", scope: "business" },
  { name: "Other Business Expense", type: "expense", icon: "📦", scope: "business" },
  // Shared expenses (personal/business split)
  { name: "Starlink (ISP)", type: "expense", icon: "📡", scope: "shared" },
  { name: "Home Office", type: "expense", icon: "🏠", scope: "shared" },
  { name: "Hardware", type: "expense", icon: "💻", scope: "shared" },
  { name: "Phone", type: "expense", icon: "📱", scope: "shared" },
  // Personal expenses
  { name: "Tenant Appliances", type: "expense", icon: "🧺", scope: "personal" },
  { name: "Rental Property Costs", type: "expense", icon: "🔧", scope: "personal" },
  { name: "Personal Other", type: "expense", icon: "📦", scope: "personal" },
  // Business income
  { name: "Sponsor Payments", type: "income", icon: "💰", scope: "business" },
  { name: "Other Business Income", type: "income", icon: "📈", scope: "business" },
  // Personal income
  { name: "Employment Income", type: "income", icon: "💼", scope: "personal" },
  { name: "Rental Income", type: "income", icon: "🏘️", scope: "personal" },
  { name: "Director Loan Repayment (received)", type: "income", icon: "💵", scope: "personal" },
  { name: "Other Personal Income", type: "income", icon: "📈", scope: "personal" },
];

// GET — list all categories
export async function GET() {
  try {
    const db = await getDb();
    let categories = await db
      .collection("accounting_categories")
      .find({})
      .sort({ scope: 1, type: 1, name: 1 })
      .toArray();

    // Auto-seed if empty (first time setup)
    if (categories.length === 0) {
      const seeded = DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        createdAt: new Date().toISOString(),
      }));
      await db.collection("accounting_categories").insertMany(seeded);
      categories = await db
        .collection("accounting_categories")
        .find({})
        .sort({ scope: 1, type: 1, name: 1 })
        .toArray();
    } else {
      // Backfill scope field on existing categories (default: business)
      const needsScope = categories.filter((c) => !c.scope);
      if (needsScope.length > 0) {
        for (const cat of needsScope) {
          // Smart defaults based on name
          let scope: "business" | "personal" | "shared" = "business";
          const name = (cat.name as string).toLowerCase();
          if (name.includes("rental") || name.includes("tenant") || name.includes("employment")) {
            scope = "personal";
          } else if (name.includes("home office") || name.includes("hardware") || name.includes("starlink")) {
            scope = "shared";
          }
          await db
            .collection("accounting_categories")
            .updateOne({ _id: cat._id }, { $set: { scope } });
        }
        // Re-fetch
        categories = await db
          .collection("accounting_categories")
          .find({})
          .sort({ scope: 1, type: 1, name: 1 })
          .toArray();
      }
    }

    return NextResponse.json(categories);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — add a new category
export async function POST(req: NextRequest) {
  try {
    const { name, type, icon, scope } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing name or type (income/expense)" },
        { status: 400 }
      );
    }
    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { error: "Type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }
    const finalScope = scope && ["business", "personal", "shared"].includes(scope) ? scope : "business";

    const db = await getDb();

    const existing = await db
      .collection("accounting_categories")
      .findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return NextResponse.json(
        { error: `Category '${name}' already exists` },
        { status: 409 }
      );
    }

    const category = {
      name,
      type,
      icon: icon || (type === "income" ? "📈" : "📦"),
      scope: finalScope,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("accounting_categories").insertOne(category);

    return NextResponse.json(
      { ...category, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update a category (name, icon, scope)
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const allowedFields = ["name", "icon", "scope"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }
    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db
      .collection("accounting_categories")
      .updateOne({ _id: new ObjectId(id) }, { $set: safeUpdates });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — remove a category by ID
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db.collection("accounting_categories").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
