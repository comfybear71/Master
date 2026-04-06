import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const newProspects = [
      // Top-Tier Simulation & AI
      { company: "NVIDIA", email: "partnerships@nvidia.com", website: "nvidia.com", industry: "Apps & SaaS", subCategory: "AI/GPU Hardware", country: "USA", notes: "Omniverse platform — build simulated worlds. Huge sponsorship budget. Pitch: AIG!itch runs on NVIDIA" },
      { company: "Unity", email: "partnerships@unity.com", website: "unity.com", industry: "Apps & SaaS", subCategory: "Game Engine", country: "USA", notes: "Powers virtual worlds and games. Creator tools angle" },
      { company: "Microsoft Azure", email: "partnerships@microsoft.com", website: "azure.microsoft.com", industry: "Apps & SaaS", subCategory: "Cloud/AI", country: "USA", notes: "Mesh, Azure AI, spatial computing. Enterprise metaverse" },
      // Consumer Brands That Love AI/Weird
      { company: "Coca-Cola", email: "partnerships@coca-cola.com", website: "coca-cola.com", industry: "Food & Snacks", subCategory: "Beverage", country: "USA", notes: "Ran 'Create Real Magic' AI art campaign. Love generative creative. Pitch: GLITCH Cola in-universe" },
      { company: "Pepsi", email: "partnerships@pepsico.com", website: "pepsi.com", industry: "Food & Snacks", subCategory: "Beverage", country: "USA", notes: "Rival to Coca-Cola — competitive pitch angle" },
      // AI-Native Companies
      { company: "Inworld AI", email: "partnerships@inworld.ai", website: "inworld.ai", industry: "Apps & SaaS", subCategory: "AI NPCs/Agents", country: "USA", notes: "Build lifelike NPCs. Perfect for populating AIG!itch worlds with sponsor-funded AI inhabitants" },
      { company: "Stability AI", email: "partnerships@stability.ai", website: "stability.ai", industry: "Apps & SaaS", subCategory: "AI Image Gen", country: "UK", notes: "Stable Diffusion creators. Image generation for personas" },
      { company: "Anthropic", email: "partnerships@anthropic.com", website: "anthropic.com", industry: "Apps & SaaS", subCategory: "AI/LLM", country: "USA", notes: "Claude makers — we already use their API. Natural partnership" },
      { company: "OpenAI", email: "partnerships@openai.com", website: "openai.com", industry: "Apps & SaaS", subCategory: "AI/LLM", country: "USA", notes: "ChatGPT/DALL-E. Massive brand recognition" },
      // Cloud/Compute Sponsors
      { company: "AWS", email: "aws-partnerships@amazon.com", website: "aws.amazon.com", industry: "Apps & SaaS", subCategory: "Cloud", country: "USA", notes: "Could sponsor compute credits for video generation" },
      { company: "Google Cloud", email: "cloud-partnerships@google.com", website: "cloud.google.com", industry: "Apps & SaaS", subCategory: "Cloud/AI", country: "USA", notes: "Vertex AI, cloud compute for content generation" },
      { company: "DigitalOcean", email: "partnerships@digitalocean.com", website: "digitalocean.com", industry: "Apps & SaaS", subCategory: "Cloud", country: "USA", notes: "Already use them for hosting. Natural sponsor" },
      // Metaverse/Virtual World Adjacent
      { company: "Roblox", email: "partnerships@roblox.com", website: "roblox.com", industry: "Gaming", subCategory: "Virtual World", country: "USA", notes: "Creator ecosystem — cross-promotion angle" },
      { company: "Epic Games", email: "partnerships@epicgames.com", website: "epicgames.com", industry: "Gaming", subCategory: "Game Engine", country: "USA", notes: "Unreal Engine, Fortnite. Virtual world builders" },
      { company: "Spatial", email: "hello@spatial.io", website: "spatial.io", industry: "Apps & SaaS", subCategory: "Metaverse", country: "USA", notes: "Metaverse platform — cross-promotion between virtual worlds" },
      // AI Voice/Audio
      { company: "Synthesia", email: "partnerships@synthesia.io", website: "synthesia.io", industry: "Apps & SaaS", subCategory: "AI Video", country: "UK", notes: "AI video generation — could power persona video content" },
      { company: "Heygen", email: "partnerships@heygen.com", website: "heygen.com", industry: "Apps & SaaS", subCategory: "AI Video", country: "USA", notes: "AI avatar videos — natural fit for persona content" },
      // Automotive/Futuristic
      { company: "BMW", email: "press@bmwgroup.com", website: "bmw.com", industry: "Fashion & Lifestyle", subCategory: "Automotive", country: "Germany", notes: "Digital factory twins, futuristic brand. Wild sponsorship angle" },
      { company: "Tesla", email: "press@tesla.com", website: "tesla.com", industry: "Fashion & Lifestyle", subCategory: "Automotive", country: "USA", notes: "Elon connection, AI/robot angle, Optimus bot" },
      // Crypto Adjacent
      { company: "Solana Foundation", email: "partnerships@solana.org", website: "solana.org", industry: "Crypto", subCategory: "Blockchain", country: "USA", notes: "$BUDJU runs on Solana. Natural alignment. Foundation has grants" },
      { company: "Jupiter Exchange", email: "partnerships@jup.ag", website: "jup.ag", industry: "Crypto", subCategory: "DEX", country: "USA", notes: "Biggest Solana DEX — where $BUDJU trades" },
      { company: "Magic Eden", email: "partnerships@magiceden.io", website: "magiceden.io", industry: "Crypto", subCategory: "NFT Marketplace", country: "USA", notes: "Solana NFT marketplace — could mint persona NFTs" },
    ];

    let added = 0;
    let skipped = 0;
    for (const p of newProspects) {
      const exists = await db.collection("prospects").findOne({ company: p.company });
      if (exists) {
        skipped++;
        continue;
      }
      await db.collection("prospects").insertOne({
        ...p,
        status: "new",
        emailsSent: 0,
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    return NextResponse.json({ success: true, added, skipped, total: newProspects.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
