import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// Default expense categories (pre-seeded, fully editable by user)
const DEFAULT_CATEGORIES = [
  { name: "Anthropic (Claude API)", type: "expense", icon: "🤖" },
  { name: "xAI (Grok)", type: "expense", icon: "🧠" },
  { name: "Vercel", type: "expense", icon: "▲" },
  { name: "DigitalOcean", type: "expense", icon: "🌊" },
  { name: "Starlink (ISP)", type: "expense", icon: "📡" },
  { name: "Resend", type: "expense", icon: "📧" },
  { name: "ImprovMX", type: "expense", icon: "📬" },
  { name: "X (Twitter)", type: "expense", icon: "𝕏" },
  { name: "Claude Max", type: "expense", icon: "💎" },
  { name: "Stripe Fees", type: "expense", icon: "💳" },
  { name: "Domain Names", type: "expense", icon: "🌐" },
  { name: "Home Office", type: "expense", icon: "🏠" },
  { name: "Hardware", type: "expense", icon: "💻" },
  { name: "Other Expense", type: "expense", icon: "📦" },
  { name: "Rental Income", type: "income", icon: "🏘️" },
  { name: "Sponsor Payments", type: "income", icon: "💰" },
  { name: "Other Income", type: "income", icon: "📈" },
];

// GET — list all categories
export async function GET() {
  try {
    const db = await getDb();
    let categories = await db
      .collection("accounting_categories")
      .find({})
      .sort({ type: 1, name: 1 })
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
        .sort({ type: 1, name: 1 })
        .toArray();
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
    const { name, type, icon } = await req.json();

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

    const db = await getDb();

    // Check for duplicate name
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
