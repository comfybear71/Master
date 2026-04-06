import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const newProspects = [
      // VPN
      { company: "CyberGhost", email: "affiliates@cyberghostvpn.com", website: "cyberghostvpn.com", industry: "VPN/Security", subCategory: "VPN", country: "Germany", notes: "Major VPN brand, active sponsor program" },
      { company: "ProtonVPN", email: "partnerships@protonvpn.com", website: "protonvpn.com", industry: "VPN/Security", subCategory: "VPN", country: "Switzerland", notes: "Privacy-focused VPN" },
      { company: "IPVanish", email: "affiliates@ipvanish.com", website: "ipvanish.com", industry: "VPN/Security", subCategory: "VPN", country: "USA", notes: "" },
      { company: "Private Internet Access", email: "affiliates@privateinternetaccess.com", website: "privateinternetaccess.com", industry: "VPN/Security", subCategory: "VPN", country: "USA", notes: "" },
      // Gaming
      { company: "Razer", email: "partnerships@razer.com", website: "razer.com", industry: "Gaming", subCategory: "Gaming Hardware", country: "USA", notes: "Gaming hardware giant" },
      { company: "SteelSeries", email: "partnerships@steelseries.com", website: "steelseries.com", industry: "Gaming", subCategory: "Gaming Hardware", country: "Denmark", notes: "" },
      { company: "HyperX", email: "partnerships@hyperx.com", website: "hyperx.com", industry: "Gaming", subCategory: "Gaming Hardware", country: "USA", notes: "" },
      { company: "Corsair", email: "sponsorship@corsair.com", website: "corsair.com", industry: "Gaming", subCategory: "Gaming Hardware", country: "USA", notes: "" },
      { company: "Logitech G", email: "sponsorship@logitech.com", website: "logitechg.com", industry: "Gaming", subCategory: "Gaming Hardware", country: "Switzerland", notes: "" },
      // Energy Drinks
      { company: "Monster Energy", email: "sponsorships@monsterenergy.com", website: "monsterenergy.com", industry: "Food & Snacks", subCategory: "Energy Drinks", country: "USA", notes: "Massive sponsorship budget" },
      { company: "G Fuel", email: "partners@gfuel.com", website: "gfuel.com", industry: "Food & Snacks", subCategory: "Energy Drinks", country: "USA", notes: "Gaming energy brand — perfect fit" },
      { company: "Celsius", email: "partnerships@celsius.com", website: "celsius.com", industry: "Food & Snacks", subCategory: "Energy Drinks", country: "USA", notes: "" },
      { company: "PRIME", email: "partnerships@drinkprime.com", website: "drinkprime.com", industry: "Food & Snacks", subCategory: "Energy Drinks", country: "USA", notes: "Logan Paul brand — massive reach" },
      // Crypto
      { company: "Coinbase", email: "affiliates@coinbase.com", website: "coinbase.com", industry: "Crypto", subCategory: "Crypto Exchange", country: "USA", notes: "Largest US crypto exchange" },
      { company: "Binance", email: "partnerships@binance.com", website: "binance.com", industry: "Crypto", subCategory: "Crypto Exchange", country: "Global", notes: "Largest global crypto exchange" },
      { company: "Kraken", email: "partnerships@kraken.com", website: "kraken.com", industry: "Crypto", subCategory: "Crypto Exchange", country: "USA", notes: "" },
      { company: "Phantom Wallet", email: "partnerships@phantom.app", website: "phantom.app", industry: "Crypto", subCategory: "Crypto Wallet", country: "USA", notes: "Solana wallet — direct fit with $BUDJU" },
      { company: "Ledger", email: "affiliates@ledger.com", website: "ledger.com", industry: "Crypto", subCategory: "Hardware Wallet", country: "France", notes: "" },
      // AI/Tech
      { company: "Midjourney", email: "press@midjourney.com", website: "midjourney.com", industry: "Apps & SaaS", subCategory: "AI Image Gen", country: "USA", notes: "AI image generation — natural fit" },
      { company: "RunwayML", email: "partnerships@runwayml.com", website: "runwayml.com", industry: "Apps & SaaS", subCategory: "AI Video", country: "USA", notes: "AI video tools" },
      { company: "ElevenLabs", email: "partnerships@elevenlabs.io", website: "elevenlabs.io", industry: "Apps & SaaS", subCategory: "AI Voice", country: "USA", notes: "AI voice — could power persona voices" },
      { company: "Jasper AI", email: "partnerships@jasper.ai", website: "jasper.ai", industry: "Apps & SaaS", subCategory: "AI Writing", country: "USA", notes: "" },
      { company: "Copy.ai", email: "partnerships@copy.ai", website: "copy.ai", industry: "Apps & SaaS", subCategory: "AI Writing", country: "USA", notes: "" },
      // Food/Drink
      { company: "Liquid Death", email: "partners@liquiddeath.com", website: "liquiddeath.com", industry: "Food & Snacks", subCategory: "Beverage", country: "USA", notes: "Edgy brand — perfect fit for AIG!itch aesthetic" },
      { company: "AG1 (Athletic Greens)", email: "partnerships@athleticgreens.com", website: "drinkag1.com", industry: "Food & Snacks", subCategory: "Supplements", country: "USA", notes: "Sponsors every podcast" },
      { company: "Huel", email: "affiliates@huel.com", website: "huel.com", industry: "Food & Snacks", subCategory: "Meal Replacement", country: "UK", notes: "" },
      // Fashion/Lifestyle
      { company: "MVMT Watches", email: "influencers@mvmt.com", website: "mvmt.com", industry: "Fashion & Lifestyle", subCategory: "Watches", country: "USA", notes: "Heavy creator sponsorships" },
      { company: "Ridge Wallet", email: "partnerships@ridgewallet.com", website: "ridgewallet.com", industry: "Fashion & Lifestyle", subCategory: "Accessories", country: "USA", notes: "Sponsors every YouTube channel" },
      { company: "Manscaped", email: "partnerships@manscaped.com", website: "manscaped.com", industry: "Fashion & Lifestyle", subCategory: "Grooming", country: "USA", notes: "" },
      { company: "HelloFresh", email: "influencer@hellofresh.com", website: "hellofresh.com", industry: "Food & Snacks", subCategory: "Meal Kits", country: "USA", notes: "" },
      // Apps
      { company: "Squarespace", email: "sponsorships@squarespace.com", website: "squarespace.com", industry: "Apps & SaaS", subCategory: "Website Builder", country: "USA", notes: "Biggest podcast sponsor in the world" },
      { company: "Asana", email: "partners@asana.com", website: "asana.com", industry: "Apps & SaaS", subCategory: "Project Management", country: "USA", notes: "" },
      // Creator Tools
      { company: "Riverside.fm", email: "partnerships@riverside.fm", website: "riverside.fm", industry: "Apps & SaaS", subCategory: "Recording/Podcast", country: "Israel", notes: "" },
      { company: "Descript", email: "partnerships@descript.com", website: "descript.com", industry: "Apps & SaaS", subCategory: "Video Editing", country: "USA", notes: "" },
      { company: "Epidemic Sound", email: "partnerships@epidemicsound.com", website: "epidemicsound.com", industry: "Apps & SaaS", subCategory: "Music Licensing", country: "Sweden", notes: "" },
      { company: "Artlist", email: "partnerships@artlist.io", website: "artlist.io", industry: "Apps & SaaS", subCategory: "Music/Stock", country: "Israel", notes: "" },
      // Australian
      { company: "Koala Mattress", email: "hello@koala.com", website: "koala.com", industry: "Fashion & Lifestyle", subCategory: "Furniture", country: "AUD", notes: "Aussie brand — local advantage" },
      { company: "Who Gives A Crap", email: "hello@whogivesacrap.org", website: "whogivesacrap.org", industry: "Fashion & Lifestyle", subCategory: "Eco Products", country: "AUD", notes: "Fun brand, eco-friendly" },
      { company: "thankyou.", email: "hello@thankyou.co", website: "thankyou.co", industry: "Fashion & Lifestyle", subCategory: "Personal Care", country: "AUD", notes: "" },
      { company: "Frank Body", email: "hello@frankbody.com", website: "frankbody.com", industry: "Fashion & Lifestyle", subCategory: "Skincare", country: "AUD", notes: "" },
    ];

    // Check for duplicates
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
